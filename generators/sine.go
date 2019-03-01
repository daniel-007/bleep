package generators

import (
	"math"

	"github.com/bspaans/bs8bs/audio"
)

type SineWaveOscillator struct {
	Pitch  float64
	Period float64
}

func NewSineWaveOscillator() *SineWaveOscillator {
	return &SineWaveOscillator{
		Pitch:  440.0,
		Period: 0.0,
	}
}

func (s *SineWaveOscillator) GetSamples(cfg *audio.AudioConfig, n int) []float64 {
	result := make([]float64, n)
	if s.Pitch == 0.0 {
		return result
	}
	stepSize := (s.Pitch * math.Pi * 2) / float64(cfg.SampleRate)
	for i := 0; i < n; i++ {
		v := math.Sin(s.Period)
		//maxValue := math.Pow(2, float64(cfg.BitDepth))
		//scaled := (v + 1) * (maxValue / 2)
		//clipped := math.Min(math.Max(0, math.Ceil(scaled)), maxValue-1)
		result[i] = v
		s.Period += stepSize
	}
	return result
}

func (s *SineWaveOscillator) SetPitch(f float64) {
	s.Pitch = f
}