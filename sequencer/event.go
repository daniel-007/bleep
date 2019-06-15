package sequencer

import "github.com/bspaans/bleep/sequencer/definitions"

type EventType int

const (
	RestartSequencer EventType = iota
	ReloadSequencer  EventType = iota
	SetSequencerDef  EventType = iota

	ForwardSequencer  EventType = iota
	BackwardSequencer EventType = iota
	IncreaseBPM       EventType = iota
	DecreaseBPM       EventType = iota

	StartPlaying    EventType = iota
	StopPlaying     EventType = iota
	PausePlaying    EventType = iota
	RewindSequencer EventType = iota

	LoadFile EventType = iota

	QuitSequencer EventType = iota
)

type SequencerEvent struct {
	Type         EventType
	SequencerDef *definitions.SequencerDef
	Value        string
}

func NewSequencerEvent(ty EventType) *SequencerEvent {
	return &SequencerEvent{
		Type: ty,
	}
}
