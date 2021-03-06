package theory

import "testing"

func Test_EuclidianRhythm(t *testing.T) {
	unit := EuclidianRhythm(2, 4)
	if !unit[0] || !unit[2] {
		t.Errorf("Expecting 0 and 2 to be on")
	}
	if unit[1] || unit[3] {
		t.Errorf("Expecting 1 and 3 to be off")
	}
}

func Test_EuclidianRhythm_example(t *testing.T) {
	example := EuclidianRhythm(5, 13)
	for _, x := range []int{0, 3, 5, 8, 10} {
		if !example[x] {
			t.Errorf("Expecting %d to be on", x)
		}
	}
	for _, x := range []int{1, 2, 4, 6, 7, 9, 11, 12} {
		if example[x] {
			t.Errorf("Expecting %d to be off", x)
		}
	}
}

func Test_EuclidianRhythm_right_amount_of_ons(t *testing.T) {
	for i := 0; i <= 16; i++ {
		for j := 0; j <= i; j++ {
			unit := EuclidianRhythm(j, i)
			on := 0
			for _, b := range unit {
				if b {
					on++
				}
			}
			if on != j {
				t.Errorf("Expecting %d notes to be on in E(%d, %d): got %d:\n%v", j, j, i, on, unit)
			}
		}
	}
}
