import { ChannelInput, ChannelOutput, Filter, SampleGenerator } from './module_units';
import { Module } from './module.js';
import { Patch } from './patch.js';

export class Instrument {
  constructor(modules, patches) {
    this.modules = modules;
    this.patches = patches;
  }
  addPatch(fromMod, toMod, fromSocket, toSocket) {
    var from = null;
    var to = null;
    for (var i = 0; i < this.modules.length; i++) {
      var m = this.modules[i];
      if (m === fromMod) {
        from = i;
      }
      if (m === toMod) {
        to = i;
      }
    }
    if (from === null || to === null || (from === to && fromSocket === toSocket)) {
      return
    }
    var patch = new Patch(from, to, fromSocket, toSocket);
    var remove = null;
    for (var i = 0; i < this.patches.length; i++) {
      var p = this.patches[i];
      if (p.isIsomorphic(patch)) {
        remove = i;
        break;
      }
    }
    if (remove === null) {
      this.patches.push(patch);
    } else {
      this.patches.splice(remove, 1);
    }
  }
  loadFromDefinition(instrDef) {
    var modules = [
      new Module(this, 10, 40, new ChannelInput('input')), 
      new Module(this, 700, 40, new ChannelOutput('output')),
    ];
    var patches = [

    ];
    this.modules = modules;
    this.patches = patches;
    var ix = this.loadGenerator(instrDef, 0, 1);
    if (ix) {
      var p = new Patch(ix, 0, "FREQ", "FREQ");
      this.patches.push(p);
    }
  }
  loadGenerator(instrDef, input, output) {
    if (instrDef["combined"]) {
      for (var iDef of instrDef["combined"]) {
        var ix = this.loadGenerator(iDef, input, output);
        if (ix) {
          var p = new Patch(input, ix, "FREQ", "FREQ");
          this.patches.push(p);
        }
      }
    } else if (instrDef["panning"]) {
      var g = this.loadGenerator(instrDef["panning"], input, output);
      // TODO: add a PANNING generator block
      return g;
    } else if (instrDef["transpose"]) {
      var g = this.loadGenerator(instrDef["transpose"], input, output);
      // TODO: add a TRANSPOSE generator block
      return g;
    } else if (instrDef["wav"]) {
      var m = new Module(this, 300, 40, new SampleGenerator("wav"));
      var p = new Patch(this.modules.length, output, "OUT", "IN");
      this.modules.push(m);
      this.patches.push(p);
      return this.modules.length - 1;
    } else if (instrDef["triangle"] || instrDef["square"] || instrDef["sawtooth"]) {
      var typ = "triangle";
      var instr = null;
      if (instrDef["triangle"]) {
        instr = instrDef["triangle"];
      } else if (instrDef["square"]) {
        instr = instrDef["square"];
        typ = "square";
      } else if (instrDef["sawtooth"]) {
        instr = instrDef["sawtooth"];
        typ = "saw";
      }
      var g = new SampleGenerator(typ);
      g.dials["attack"].value = instr["attack"] || 0.0;
      g.dials["decay"].value = instr["decay"] || 0.0;
      g.dials["sustain"].value = instr["sustain"] || 0.0;
      g.dials["release"].value = instr["release"] || 0.0;
      var m = new Module(this, Math.random() * 800 + 100, Math.random() * 600 + 20, g);
      var p = new Patch(this.modules.length, output, "OUT", "IN");
      this.modules.push(m);
      this.patches.push(p);
      return this.modules.length - 1;
    } else {
      throw 'Unknown instrument def ' + instrDef;
    }
  }
  load(instrDef) {
    var modules = [];
    for (var m of instrDef.modules) {
      var g = null;
      if (m.type == "input") {
        g = new ChannelInput(m.type);
      } else if (m.type == "output") {
        g = new ChannelOutput(m.type);
      } else if (m.type == "low pass filter") {
        g = new Filter(m.type);
      } else if (m.type == "sine" || m.type == "triangle") {
        g = new SampleGenerator(m.type);
      }
      if (g) {
        var mod = new Module(this, m.x, m.y, g);
        modules.push(mod);
      }
    }
    var patches = [];
    for (var p of instrDef.patches) {
      var patch = new Patch(p.from_module, p.to_module, p.from_socket, p.to_socket);
      patches.push(patch);
    }
    this.modules = modules;
    this.patches = patches;
  }

  compile() {
    var output = null;
    for (var i = 0; i < this.modules.length; i++) {
      var m = this.modules[i];
      if (m.unit.type == "output") {
        output = i;
      }
    }
    if (!output) {
      return null;
    }

    var queue = [output];
    var seen = {};
    var dependencies = [output];
    while (queue.length > 0) {
      var q = queue[0];
      var queue = queue.splice(1);
      for (var p of this.patches) {
        if (p.to === q && (p.toSocket == "IN" || p.toSocket == "FREQ")) {
          if (!seen[p.from]) {
            dependencies.push(p.from);
            queue.push(p.from);
            seen[p.from] = true;
          }
        } else if (p.from === q && (p.fromSocket == "IN" || p.fromSocket == "FREQ")){
          if (!seen[p.to]) {
            dependencies.push(p.to);
            queue.push(p.to);
            seen[p.to] = true;
          }
        }
      }
      seen[q] = true;
    }
    var generators = {};
    for (var i = dependencies.length - 1; i >= 0; i--) {
      var ix = dependencies[i];
      var unit = this.modules[ix].unit;
      var g = null;
      if (unit.type == "input") {
        g = null;
      } else if (unit.type == "triangle" || unit.type == "sine" || unit.type == "saw" || unit.type == "square" || unit.type == "white_noise") {
        g = {};
        g[unit.type] = {
          "attack": unit.dials["attack"].value,
          "decay": unit.dials["decay"].value,
          "sustain": unit.dials["sustain"].value,
          "release": unit.dials["release"].value,
        };
        var pitchFound = false;
        for (var p of this.patches) {
          if (p.to === ix && p.toSocket == "FREQ") {
            pitchFound = true;
            var pg = generators[p.from];
            if (pg) {
              g[unit.type]["auto_pitch"] = pg;
            }
          }
        }
        if (!pitchFound) {
          g[unit.type]["pitch"] = unit.dials["pitch"].value;
        }
      } else if (unit.type == "low pass filter") {
        g = {};
        g["filter"] = {"lpf": {"cutoff": unit.dials["cutoff"].value}}
        var on = this.compileGenerators(generators, ix, "IN");
        Object.keys(on).map((k) => {
          g["filter"][k] = on[k];
        });
      } else if (unit.type == "high pass filter") {
        g = {};
        g["filter"] = {"hpf": {"cutoff": unit.dials["cutoff"].value}}
        var on = this.compileGenerators(generators, ix, "IN");
        Object.keys(on).map((k) => {
          g["filter"][k] = on[k];
        });
      } else if (unit.type == "output") {
        return this.compileGenerators(generators, ix, "IN");
      }
      generators[ix] = g;
    }
    return dependencies;
  }

  compileGenerators(generators, ix, input) {
    var gs = [];
    for (var p of this.patches) {
      if (p.to === ix && p.toSocket === input) {
        gs.push(generators[p.from])
      } else if (p.from == ix && p.fromSocket === input) {
        gs.push(generators[p.to])
      }
    }
    if (gs.length === 0) {
      return null;
    } else if (gs.length === 1) {
      return gs[0];
    } else {
      return {"combined": gs}
    }
  }
}
