
const LBS_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const BMI_IMPERIAL_CONSTANT = 703.06958;

function calculate(system, weight, height, feet, inches, age, gender, activity, goal) {
    let bmiValue = 0; let piValue = 0; let bmrValue = 0; let tdeeValue = 0;
    let w = parseFloat(weight) || 0; let h = 0;

    if (system === 'metric') {
      h = parseFloat(height) || 0;
      if (w > 0 && h > 0) {
        const hM = h / 100;
        bmiValue = w / Math.pow(hM, 2);
        piValue = w / Math.pow(hM, 3);
        if (age && gender) {
          const a = parseInt(age);
          bmrValue = gender === 'male' 
            ? 10 * w + 6.25 * h - 5 * a + 5 
            : 10 * w + 6.25 * h - 5 * a - 161;
          tdeeValue = bmrValue * parseFloat(activity);
        }
      }
    } else if (system === 'us') {
      const f = parseFloat(feet) || 0;
      const i = parseFloat(inches) || 0;
      h = f * 12 + i;
      if (w > 0 && h > 0) {
        bmiValue = (w * BMI_IMPERIAL_CONSTANT) / Math.pow(h, 2);
        const wKg = w * LBS_TO_KG; 
        const hCm = h * IN_TO_CM; 
        const hM = hCm / 100;
        piValue = wKg / Math.pow(hM, 3);
        if (age && gender) {
          const a = parseInt(age);
          bmrValue = gender === 'male' 
            ? 10 * wKg + 6.25 * hCm - 5 * a + 5 
            : 10 * wKg + 6.25 * hCm - 5 * a - 161;
          tdeeValue = bmrValue * parseFloat(activity);
        }
      }
    } else {
        h = parseFloat(height) || 0;
        if (w > 0 && h > 0) {
            bmiValue = w / Math.pow(h, 2);
            piValue = w / Math.pow(h, 3);
            if (age && gender) {
                const a = parseInt(age);
                bmrValue = gender === 'male' 
                  ? 10 * w + 6.25 * (h * 100) - 5 * a + 5 
                  : 10 * w + 6.25 * (h * 100) - 5 * a - 161;
                tdeeValue = bmrValue * parseFloat(activity);
            }
        }
    }

    const goalCalories = tdeeValue ? (goal === 'loss' ? tdeeValue - 500 : goal === 'gain' ? tdeeValue + 500 : tdeeValue) : null;

    return { bmi: bmiValue, bmr: bmrValue, tdee: tdeeValue, goalCalories };
}

// Test cases
console.log("Metric Test:", calculate('metric', '80', '180', '', '', '25', 'male', '1.375', 'maintenance'));
console.log("US Test:", calculate('us', '175', '', '5', '11', '25', 'male', '1.375', 'maintenance'));
console.log("Other Test:", calculate('other', '80', '1.8', '', '', '25', 'male', '1.375', 'maintenance'));
console.log("Goal Loss Test:", calculate('metric', '80', '180', '', '', '25', 'male', '1.375', 'loss'));
console.log("Goal Gain Test:", calculate('metric', '80', '180', '', '', '25', 'male', '1.375', 'gain'));
console.log("Missing Age Test:", calculate('metric', '80', '180', '', '', '', 'male', '1.375', 'maintenance'));
console.log("Missing Gender Test:", calculate('metric', '80', '180', '', '', '25', '', '1.375', 'maintenance'));
