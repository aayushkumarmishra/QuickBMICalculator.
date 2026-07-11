import type { jsPDF } from 'jspdf';

export interface PDFData {
  profileName: string;
  nickname?: string;
  relation?: string;
  calculatorType: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake' | 'body_fat' | 'lean_body_mass' | 'protein_intake' | 'macro' | 'daily_nutrition';
  inputData: any;
  resultData: any;
  date: string;
}

/**
 * Robust mapping logic to normalize data from both live components and DB records
 */
const mapToStandardMetrics = (input: any, system: string = 'metric') => {
  const m: any = {};
  
  // 1. Age
  m.age = input.age || '--';
  
  // 2. Gender
  m.gender = (input.gender || '--').toUpperCase();
  
  // 3. Activity
  const activityLevels: Record<string, string> = {
    '1.2': 'Sedentary',
    '1.375': 'Lightly Active',
    '1.55': 'Moderately Active',
    '1.725': 'Very Active',
    '1.9': 'Extra Active'
  };
  const actVal = input.activity || input.activity_level;
  m.activity = activityLevels[actVal] || actVal?.replace(/_/g, ' ') || 'Moderate';
  
  // 4. Height
  if (input.feet !== undefined) {
    m.height = `${input.feet}ft ${input.inches || 0}in`;
  } else if (input.height_cm) {
    m.height = `${input.height_cm}cm`;
  } else if (input.height) {
    const unit = input.heightUnitOther || input.height_unit || (system === 'us' ? 'in' : 'cm');
    m.height = `${input.height}${unit}`;
  } else {
    m.height = '--';
  }

  // 5. Weight
  if (input.weight_lb) {
    m.weight = `${input.weight_lb} lb`;
  } else if (input.weight_kg) {
    m.weight = `${input.weight_kg} kg`;
  } else if (input.weight) {
    const unit = input.weightUnitOther || input.weight_unit || (system === 'us' ? 'lb' : 'kg');
    m.weight = `${input.weight} ${unit}`;
  } else {
    m.weight = '--';
  }

  // 6. Goal
  m.goal = (input.goal || 'Maintenance').toUpperCase();

  return m;
};

export const generateReportPDF = async (data: PDFData) => {
  if (typeof window === 'undefined') return;

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const iData = data.inputData;
  const rData = data.resultData;
  const system = iData.system || 'metric';
  const metrics = mapToStandardMetrics(iData, system);

  // Helper: Section Title
  const sectionTitle = (title: string, yPos: number) => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(150, 150, 150);
    pdf.text(title.toUpperCase(), margin, yPos);
    return yPos + 6;
  };

  // 1. Header with Dark Band
  const headerHeight = data.relation ? 48 : 42;
  pdf.setFillColor(23, 23, 23);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('QuickBMICalculator', margin, 20);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(180, 180, 180);
  const typeLabels: Record<string, string> = {
    bmi: 'Professional Biometric Analysis',
    bmr: 'Basal Metabolic Rate Analysis',
    calorie: 'Daily Calorie Requirements',
    ideal_weight: 'Ideal Weight Analysis',
    water_intake: 'Hydration Requirements',
    body_fat: 'Body Fat Composition Analysis',
    lean_body_mass: 'Lean Body Mass Analysis',
    protein_intake: 'Daily Protein Requirements',
    macro: 'Macronutrient Balancer Split',
    daily_nutrition: 'Daily Nutrition Plan Analysis'
  };
  pdf.text(typeLabels[data.calculatorType] || 'Health Report', margin, 26);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const displayName = data.nickname ? `${data.profileName} (${data.nickname})` : data.profileName;
  pdf.text(displayName.toUpperCase(), margin, 34);
  
  if (data.relation) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.text(data.relation.toUpperCase(), margin, 38.5);
  }
  
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  const reportId = Math.random().toString(36).substr(2, 9).toUpperCase();
  pdf.text(`REPORT ID: ${reportId}`, pageWidth - margin - 40, 20);
  pdf.text(`DATE: ${data.date}`, pageWidth - margin - 40, 24);

  y = headerHeight + 10;

  // 2. Metrics Card
  y = sectionTitle('YOUR PROFILE', y);
  pdf.setDrawColor(240, 240, 240);
  pdf.setFillColor(252, 252, 252);
  pdf.roundedRect(margin, y, pageWidth - (margin * 2), 30, 2, 2, 'FD');
  
  const colW = (pageWidth - (margin * 2)) / 3;
  
  // Row 1
  pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'normal');
  pdf.text('AGE', margin + 10, y + 7);
  pdf.text('GENDER', margin + 10 + colW, y + 7);
  pdf.text('ACTIVITY', margin + 10 + (colW * 2), y + 7);
  
  pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
  pdf.text(String(metrics.age), margin + 10, y + 12);
  pdf.text(String(metrics.gender), margin + 10 + colW, y + 12);
  pdf.text(String(metrics.activity), margin + 10 + (colW * 2), y + 12);

  // Row 2
  pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'normal');
  pdf.text('HEIGHT', margin + 10, y + 20);
  pdf.text('WEIGHT', margin + 10 + colW, y + 20);
  pdf.text('GOAL', margin + 10 + (colW * 2), y + 20);
  
  pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
  pdf.text(String(metrics.height), margin + 10, y + 25);
  pdf.text(String(metrics.weight), margin + 10 + colW, y + 25);
  pdf.text(String(metrics.goal), margin + 10 + (colW * 2), y + 25);

  y += 38;

  // 3. Analysis Results Section
  y = sectionTitle('ANALYSIS RESULTS', y);
  pdf.setDrawColor(235, 235, 235);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'D');
  
  pdf.setTextColor(100, 100, 100); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  
  if (data.calculatorType === 'bmi') {
    pdf.text('CURRENT BMI', margin + 10, y + 8);
    pdf.text('CLASSIFICATION', margin + 70, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(Number(rData.bmi || 0).toFixed(1), margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(String(rData.category || '--'), margin + 70, y + 16);
  } else if (data.calculatorType === 'bmr') {
    pdf.text('BASAL METABOLIC RATE', margin + 10, y + 8);
    pdf.text('TOTAL DAILY EXPENDITURE', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(`${Math.round(rData.bmr || 0).toLocaleString()} kcal`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(`${Math.round(rData.tdee || 0).toLocaleString()} kcal`, margin + 90, y + 16);
  } else if (data.calculatorType === 'calorie') {
    pdf.text('TARGET DAILY CALORIES', margin + 10, y + 8);
    pdf.text('SELECTED GOAL', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    const target = rData.targetCalories || (rData.caloriesByGoal ? rData.caloriesByGoal.maintenance : 0) || rData.maintenance || 0;
    pdf.text(`${Math.round(target).toLocaleString()} kcal`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text((metrics.goal || 'MAINTENANCE'), margin + 90, y + 16);
  } else if (data.calculatorType === 'ideal_weight') {
    pdf.text('IDEAL WEIGHT (DEVINE)', margin + 10, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    const ideal = rData.idealWeight || rData.ideal_weight || 0;
    pdf.text(`${Number(ideal).toFixed(1)} kg / ${(Number(ideal) * 2.20462).toFixed(1)} lb`, margin + 10, y + 16);
  } else if (data.calculatorType === 'water_intake') {
    pdf.text('DAILY WATER REQUIREMENT', margin + 10, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    const water = rData.waterIntake || rData.waterGoal || 0;
    pdf.text(`${Number(water).toFixed(1)} Liters`, margin + 10, y + 16);
  } else if (data.calculatorType === 'body_fat') {
    pdf.text('BODY FAT PERCENTAGE', margin + 10, y + 8);
    pdf.text('CLASSIFICATION', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(`${Number(rData.bodyFat || 0).toFixed(1)}%`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(String(rData.category || '--'), margin + 90, y + 16);
  } else if (data.calculatorType === 'lean_body_mass') {
    pdf.text('LEAN BODY MASS', margin + 10, y + 8);
    pdf.text('METHODOLOGY', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    const unit = system === 'us' ? 'lb' : 'kg';
    pdf.text(`${Number(rData.leanMass || 0).toFixed(1)} ${unit}`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(String(rData.method || '--'), margin + 90, y + 16);
  } else if (data.calculatorType === 'protein_intake') {
    pdf.text('PROTEIN REQUIREMENT', margin + 10, y + 8);
    pdf.text('CALORIE SHARE', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(`${Math.round(rData.proteinGoal || 0)} g/day`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(`${Math.round(rData.proteinCalories || 0)} kcal`, margin + 90, y + 16);
  } else if (data.calculatorType === 'macro') {
    pdf.text('MACRONUTRIENTS (C/P/F)', margin + 10, y + 8);
    pdf.text('DIET PROFILE', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.text(`${Math.round(rData.carbsGrams || 0)}g / ${Math.round(rData.proteinGrams || 0)}g / ${Math.round(rData.fatGrams || 0)}g`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(String(iData.preset || 'custom').toUpperCase(), margin + 90, y + 16);
  } else if (data.calculatorType === 'daily_nutrition') {
    pdf.text('DAILY CALORIE BUDGET', margin + 10, y + 8);
    pdf.text('TDEE (MAINTENANCE)', margin + 90, y + 8);
    pdf.setTextColor(23, 23, 23); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text(`${Math.round(rData.targetCalories || 0)} kcal`, margin + 10, y + 16);
    pdf.setFontSize(13);
    pdf.text(`${Math.round(rData.tdee || 0)} kcal`, margin + 90, y + 16);
  }

  y += 30;

  // 4. Visual Bar Section
  const barHeight = 8;
  const barWidth = pageWidth - (margin * 2);

  if (data.calculatorType === 'bmi' || data.calculatorType === 'ideal_weight' || data.calculatorType === 'body_fat') {
    const isBodyFat = data.calculatorType === 'body_fat';
    pdf.setFillColor(0, 112, 243); pdf.rect(margin, y, barWidth * 0.14, barHeight, 'F');
    pdf.setFillColor(0, 223, 216); pdf.rect(margin + (barWidth * 0.14), y, barWidth * 0.26, barHeight, 'F');
    pdf.setFillColor(245, 166, 35); pdf.rect(margin + (barWidth * 0.40), y, barWidth * 0.20, barHeight, 'F');
    pdf.setFillColor(255, 0, 0); pdf.rect(margin + (barWidth * 0.60), y, barWidth * 0.40, barHeight, 'F');

    const score = isBodyFat ? Number(rData.bodyFat || 22) : Number(rData.bmi || (rData.idealWeight ? 22 : 0));
    const minVal = isBodyFat ? 5 : 15;
    const maxVal = isBodyFat ? 40 : 40;
    const pct = Math.min(Math.max(((score - minVal) / (maxVal - minVal)) * 100, 0), 100);
    const markerX = margin + (barWidth * (pct / 100));

    pdf.setDrawColor(23, 23, 23); pdf.setLineWidth(0.6);
    pdf.line(markerX, y - 2, markerX, y + barHeight + 2);
    pdf.setFillColor(23, 23, 23); pdf.circle(markerX, y - 3, 1.2, 'FD');

    pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
    pdf.text(String(minVal), margin, y + barHeight + 5);
    pdf.text(isBodyFat ? '14' : '18.5', margin + (barWidth * 0.14), y + barHeight + 5, { align: 'center' });
    pdf.text(isBodyFat ? '21' : '25', margin + (barWidth * 0.40), y + barHeight + 5, { align: 'center' });
    pdf.text(isBodyFat ? '25' : '30', margin + (barWidth * 0.60), y + barHeight + 5, { align: 'center' });
    pdf.text(isBodyFat ? '32+' : '40+', margin + barWidth, y + barHeight + 5, { align: 'right' });
    y += barHeight + 15;
  } else if (data.calculatorType === 'bmr' || data.calculatorType === 'calorie') {
    // Calorie Zones
    pdf.setFillColor(0, 112, 243); pdf.rect(margin, y, barWidth * 0.33, barHeight, 'F');
    pdf.setFillColor(0, 223, 216); pdf.rect(margin + (barWidth * 0.33), y, barWidth * 0.33, barHeight, 'F');
    pdf.setFillColor(245, 166, 35); pdf.rect(margin + (barWidth * 0.66), y, barWidth * 0.34, barHeight, 'F');

    let markerPct = 0.5;
    if (metrics.goal === 'LOSS') markerPct = 0.165;
    else if (metrics.goal === 'GAIN') markerPct = 0.835;
    const markerX = margin + (barWidth * markerPct);

    pdf.setDrawColor(23, 23, 23); pdf.setLineWidth(0.6);
    pdf.line(markerX, y - 2, markerX, y + barHeight + 2);
    pdf.setFillColor(23, 23, 23); pdf.circle(markerX, y - 3, 1.2, 'FD');

    pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
    pdf.text('FAT LOSS', margin, y + barHeight + 5);
    pdf.text('MAINTENANCE', margin + (barWidth * 0.33), y + barHeight + 5);
    pdf.text('WEIGHT GAIN', margin + (barWidth * 0.66), y + barHeight + 5);
    y += barHeight + 15;
  }

  // 5. Advanced Sections side-by-side (Mostly for BMI/BMR)
  if (data.calculatorType === 'bmi' || data.calculatorType === 'ideal_weight') {
    const leftColWidth = (pageWidth - (margin * 2) - 10) * 0.55;
    const rightColWidth = (pageWidth - (margin * 2) - 10) * 0.45;

    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150, 150, 150);
    pdf.text('HEALTHY WEIGHT RANGE', margin, y);
    pdf.text('ADVANCED ANALYTICS', margin + leftColWidth + 10, y);
    
    y += 6;
    pdf.setDrawColor(240, 240, 240); pdf.roundedRect(margin, y, leftColWidth, 22, 2, 2, 'D');
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 112, 243);
    
    const range = rData.idealWeightRange || rData.healthyRange || rData.range;
    if (range) {
      const min = range.min !== undefined ? range.min : range.low;
      const max = range.max !== undefined ? range.max : range.high;
      const unit = system === 'us' ? 'lb' : 'kg';
      pdf.text(`${Number(min).toFixed(1)} - ${Number(max).toFixed(1)} ${unit}`, margin + 8, y + 10);
    } else {
      pdf.text('--', margin + 8, y + 10);
    }
    
    pdf.setFontSize(8); pdf.setTextColor(100, 100, 100);
    pdf.text('Recommended range for your height.', margin + 8, y + 16);

    pdf.roundedRect(margin + leftColWidth + 10, y, rightColWidth, 22, 2, 2, 'D');
    pdf.setFontSize(8); pdf.setTextColor(100, 100, 100);
    pdf.text('BMI PRIME', margin + leftColWidth + 18, y + 8);
    pdf.text('PONDERAL INDEX', margin + leftColWidth + 18, y + 16);
    pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
    pdf.text((Number(rData.bmi || 0) / 25).toFixed(2), margin + leftColWidth + 55, y + 8);
    pdf.text(Number(rData.ponderalIndex || 0).toFixed(1), margin + leftColWidth + 55, y + 16);
    y += 30;
  }

  // 6. Energy Expenditure Section
  y = sectionTitle('ENERGY EXPENDITURE PLAN', y);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'F');
  
  const calCol = (pageWidth - (margin * 2)) / 4;
  pdf.setFontSize(7); pdf.setTextColor(100, 100, 100);
  pdf.text('BMR BASE', margin + 5, y + 6);
  pdf.text('MAINTENANCE', margin + 5 + calCol, y + 6);
  pdf.text('WEIGHT LOSS', margin + 5 + (calCol * 2), y + 6);
  pdf.text('WEIGHT GAIN', margin + 5 + (calCol * 3), y + 6);
  
  pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
  const bmr = rData.bmr || (rData.caloriesByGoal ? rData.caloriesByGoal.bmr : 0) || 0;
  const tdee = rData.tdee || (rData.caloriesByGoal ? rData.caloriesByGoal.maintenance : 0) || rData.maintenance || 0;
  
  pdf.text(bmr ? `${Math.round(bmr).toLocaleString()} kcal` : '--', margin + 5, y + 14);
  pdf.text(tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--', margin + 5 + calCol, y + 14);
  pdf.setTextColor(235, 100, 100);
  pdf.text(tdee ? `${Math.round(tdee - 500).toLocaleString()} kcal` : '--', margin + 5 + (calCol * 2), y + 14);
  pdf.setTextColor(34, 197, 94);
  pdf.text(tdee ? `${Math.round(tdee + 500).toLocaleString()} kcal` : '--', margin + 5 + (calCol * 3), y + 14);
  y += 26;

  // 7. Activity & Hydration Section
  y = sectionTitle('ACTIVITY & HYDRATION GUIDE', y);
  pdf.setDrawColor(240, 240, 240); pdf.setFillColor(252, 252, 252);
  pdf.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'FD');

  const activityMap: Record<string, { walking: string; steps: string }> = {
    'Underweight':     { walking: '20-30 min/day', steps: '5,000-7,000 steps/day' },
    'Normal Weight':   { walking: '30 min/day',    steps: '7,000-8,000 steps/day' },
    'Overweight':      { walking: '30-45 min/day', steps: '7,000-9,000 steps/day' },
    'Obesity Class I': { walking: '30-45 min/day', steps: '9,000+ steps/day' },
    'Obesity Class II':  { walking: '30-45 min/day', steps: '9,000+ steps/day' },
    'Obesity Class III': { walking: '30-45 min/day', steps: '9,000+ steps/day' },
  };
  const category = rData.category || 'Normal Weight';
  const actData = activityMap[category] || activityMap['Normal Weight'];
  const weightKg = iData.weight_kg || iData.weight || (iData.weight_lb ? iData.weight_lb / 2.205 : 0);
  const water = rData.waterIntake || rData.waterGoal || (weightKg ? parseFloat((weightKg * 0.033).toFixed(1)) : 0);

  const ahCol = (pageWidth - (margin * 2)) / 3;
  pdf.setFontSize(7); pdf.setTextColor(100, 100, 100); pdf.setFont('helvetica', 'normal');
  pdf.text('WALKING', margin + 5, y + 6);
  pdf.text('STEPS / DAY', margin + 5 + ahCol, y + 6);
  pdf.text('WATER INTAKE', margin + 5 + (ahCol * 2), y + 6);
  pdf.setFontSize(9); pdf.setTextColor(23, 23, 23); pdf.setFont('helvetica', 'bold');
  pdf.text(actData.walking, margin + 5, y + 14);
  pdf.text(actData.steps, margin + 5 + ahCol, y + 14);
  pdf.text(water ? `${Number(water).toFixed(1)} L / day` : '--', margin + 5 + (ahCol * 2), y + 14);
  y += 30;

  // 8. WHO Table & Recommendations
  if (data.calculatorType === 'bmi') {
    const tableWidth = (pageWidth - (margin * 2)) * 0.45;
    const recX = margin + tableWidth + 15;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150, 150, 150);
    pdf.text('WHO CATEGORY REFERENCE', margin, y);
    pdf.text('RECOMMENDATIONS', recX, y);
    
    y += 4;
    const tableRows = [
      ['Underweight', '< 18.5'],
      ['Normal Weight', '18.5 - 24.9'],
      ['Overweight', '25.0 - 29.9'],
      ['Obesity', '30.0+']
    ];
    
    tableRows.forEach((row, i) => {
      const rowY = y + (i * 4.5);
      pdf.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250);
      pdf.rect(margin, rowY, tableWidth, 4.5, 'F');
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
      pdf.text(row[0], margin + 3, rowY + 3);
      pdf.text(row[1], margin + tableWidth - 15, rowY + 3);
    });

    const recsMap: Record<string, string[]> = {
      'Underweight':     ['Protein-rich foods', 'Strength training 3x/wk', 'Increase calories', 'Eat 5-6 meals/day'],
      'Normal Weight':   ['Balanced nutrition', 'Stay active 30 min/day', 'Consistent sleep', 'Stay hydrated'],
      'Overweight':      ['Walk 30-45 min daily', '7,000-9,000 steps', 'Calorie deficit', 'Reduce processed foods'],
      'Obesity':         ['Consult specialist', 'Track calories daily', 'Monitor progress', 'Regular activity']
    };
    const recs = recsMap[category.includes('Obesity') ? 'Obesity' : category] || recsMap['Normal Weight'];
    
    recs.forEach((rec, i) => {
      const recY = y + (i * 4.5);
      pdf.setDrawColor(0, 223, 216); pdf.setLineWidth(0.3);
      pdf.line(recX, recY + 3, recX + 1, recY + 4);
      pdf.line(recX + 1, recY + 4, recX + 3, recY + 1.5);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(50, 50, 50);
      pdf.text(rec, recX + 5, recY + 3.5);
    });
  } else {
    // Generic Recommendations for other types
    y = sectionTitle('RECOMMENDATIONS', y);
    const recs = rData.recommendations || ['Maintain balanced nutrition', 'Stay active daily', 'Keep consistent sleep schedule', 'Track progress monthly'];
    recs.slice(0, 5).forEach((rec: string, i: number) => {
      const recY = y + (i * 5);
      pdf.setDrawColor(0, 223, 216); pdf.setLineWidth(0.3);
      pdf.line(margin, recY + 3, margin + 1, recY + 4);
      pdf.line(margin + 1, recY + 4, margin + 3, recY + 1.5);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(50, 50, 50);
      pdf.text(rec, margin + 5, recY + 3.5);
    });
  }

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(180, 180, 180);
  pdf.text('Generated by QuickBMICalculator - Your Health Companion', margin, pageHeight - 10);
  pdf.text(`Report ID: ${reportId}`, pageWidth - margin - 35, pageHeight - 10);

  pdf.save(`QuickBMICalculator_${data.calculatorType}_Report_${data.profileName.replace(/\s+/g, '_')}.pdf`);
};

// ─── Data-Driven Report API ────────────────────────────────────────────────────

export interface DataDrivenProfileEntry {
  label: string;
  value: string;
}

export interface DataDrivenSectionRow {
  label: string;
  value: string;
  color?: string;
}

export interface DataDrivenSection {
  title?: string;
  rows: DataDrivenSectionRow[];
  columns?: number;
}

export interface DataDrivenReport {
  profileName: string;
  nickname?: string;
  relation?: string;
  calculatorType: string;
  date: string;
  unitSystem: string;

  profileRows: DataDrivenProfileEntry[];
  heroRows: { label: string; value: string }[];

  barSegments?: { color: [number, number, number]; widthPct: number; label?: string }[];
  barMarkerPct?: number;
  barMinLabel?: string;
  barMaxLabel?: string;
  barLabels?: { text: string; pct: number; align?: 'left' | 'center' | 'right' }[];

  sections: DataDrivenSection[];

  splitSection?: {
    leftTitle: string;
    leftRows: DataDrivenProfileEntry[];
    rightTitle: string;
    rightRows: DataDrivenProfileEntry[];
  };

  whoTable?: boolean;
  recommendations?: string[];
}

export const generateDataDrivenReport = async (report: DataDrivenReport) => {
  if (typeof window === 'undefined') return;

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Header band
  const headerHeight = report.relation ? 48 : 42;
  pdf.setFillColor(23, 23, 23);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('QuickBMICalculator', margin, 20);
 
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(180, 180, 180);
  const typeLabels: Record<string, string> = {
    bmi: 'Professional Biometric Analysis',
    bmr: 'Basal Metabolic Rate Analysis',
    calorie: 'Daily Calorie Requirements',
    ideal_weight: 'Ideal Weight Analysis',
    water_intake: 'Hydration Requirements',
    body_fat: 'Body Fat Composition Analysis',
    lean_body_mass: 'Lean Body Mass Analysis',
    protein_intake: 'Daily Protein Requirements',
    macro: 'Macronutrient Balancer Split',
    daily_nutrition: 'Daily Nutrition Plan Analysis'
  };
  pdf.text(typeLabels[report.calculatorType] || 'Health Report', margin, 26);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const displayName = report.nickname ? `${report.profileName} (${report.nickname})` : report.profileName;
  pdf.text(displayName.toUpperCase(), margin, 34);

  if (report.relation) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.text(report.relation.toUpperCase(), margin, 38.5);
  }

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  const reportId = Math.random().toString(36).substr(2, 9).toUpperCase();
  pdf.text(`REPORT ID: ${reportId}`, pageWidth - margin - 40, 20);
  pdf.text(`DATE: ${report.date}`, pageWidth - margin - 40, 24);

  y = headerHeight + 10;

  const sectionTitle = (title: string, yPos: number) => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(150, 150, 150);
    pdf.text(title.toUpperCase(), margin, yPos);
    return yPos + 6;
  };

  // ── Profile Card ─────────────────────────────────────────────────────────────
  if (report.profileRows.length > 0) {
    y = sectionTitle('YOUR PROFILE', y);
    const numCols = 3;
    const numRows = Math.ceil(report.profileRows.length / numCols);
    const cardHeight = 10 + numRows * 13;

    pdf.setDrawColor(240, 240, 240);
    pdf.setFillColor(252, 252, 252);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, cardHeight, 2, 2, 'FD');

    const colW = (pageWidth - margin * 2) / numCols;
    report.profileRows.forEach((entry, i) => {
      const col = i % numCols;
      const row = Math.floor(i / numCols);
      const base = y + 5 + row * 13;

      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(entry.label, margin + 10 + col * colW, base + 7);

      pdf.setFontSize(9);
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      pdf.text(entry.value, margin + 10 + col * colW, base + 12);
    });

    y += cardHeight + 8;
  }

  // ── Hero Results ─────────────────────────────────────────────────────────────
  if (report.heroRows.length > 0) {
    y = sectionTitle('ANALYSIS RESULTS', y);
    pdf.setDrawColor(235, 235, 235);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'D');

    const heroColW = (pageWidth - margin * 2) / Math.max(report.heroRows.length, 2);
    report.heroRows.forEach((entry, i) => {
      const x = margin + 10 + i * heroColW;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(entry.label, x, y + 8);

      pdf.setFontSize(16);
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      pdf.text(entry.value, x, y + 16);
    });

    y += 30;
  }

  // ── Bar Chart ────────────────────────────────────────────────────────────────
  if (report.barSegments && report.barSegments.length > 0 && report.barMarkerPct !== undefined) {
    const barHeight = 8;
    const barWidth = pageWidth - margin * 2;

    let xOff = margin;
    report.barSegments.forEach((seg) => {
      pdf.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      pdf.rect(xOff, y, barWidth * (seg.widthPct / 100), barHeight, 'F');
      xOff += barWidth * (seg.widthPct / 100);
    });

    const markerX = margin + barWidth * (report.barMarkerPct / 100);
    pdf.setDrawColor(23, 23, 23);
    pdf.setLineWidth(0.6);
    pdf.line(markerX, y - 2, markerX, y + barHeight + 2);
    pdf.setFillColor(23, 23, 23);
    pdf.circle(markerX, y - 3, 1.2, 'FD');

    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    if (report.barMinLabel) pdf.text(report.barMinLabel, margin, y + barHeight + 5);
    if (report.barMaxLabel)
      pdf.text(report.barMaxLabel, margin + barWidth, y + barHeight + 5, { align: 'right' });

    if (report.barLabels) {
      report.barLabels.forEach((label) => {
        const lx = margin + barWidth * (label.pct / 100);
        const align = label.align || 'center';
        pdf.text(label.text, lx, y + barHeight + 5, { align });
      });
    }

    y += barHeight + 18;
  }

  // ── Metric Sections ──────────────────────────────────────────────────────────
  for (const section of report.sections) {
    if (section.rows.length === 0) continue;

    if (section.title) {
      y = sectionTitle(section.title, y);
    }

    const numCols = section.columns || 3;
    const numRows = Math.ceil(section.rows.length / numCols);
    const sectionHeight = 20 + (numRows - 1) * 14;
    const colW = (pageWidth - margin * 2) / numCols;

    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, sectionHeight, 2, 2, 'F');

    section.rows.forEach((entry, i) => {
      const col = i % numCols;
      const row = Math.floor(i / numCols);
      const xPos = margin + 5 + col * colW;
      const labelY = y + 6 + row * 14;
      const valueY = y + 14 + row * 14;

      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(entry.label, xPos, labelY);

      if (entry.color) {
        const [r, g, b] = entry.color.split(',').map(Number);
        pdf.setTextColor(r, g, b);
      } else {
        pdf.setTextColor(23, 23, 23);
      }
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(entry.value, xPos, valueY);
    });

    y += sectionHeight + 6;
  }

  // ── Split Section ────────────────────────────────────────────────────────────
  if (report.splitSection) {
    const leftColWidth = (pageWidth - margin * 2 - 10) * 0.55;
    const rightColWidth = (pageWidth - margin * 2 - 10) * 0.45;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(150, 150, 150);
    pdf.text(report.splitSection.leftTitle, margin, y);
    pdf.text(report.splitSection.rightTitle, margin + leftColWidth + 10, y);

    y += 6;
    pdf.setDrawColor(240, 240, 240);
    pdf.roundedRect(margin, y, leftColWidth, 22, 2, 2, 'D');
    const range = report.splitSection.leftRows[0]?.value || '--';
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 112, 243);
    pdf.text(range, margin + 8, y + 10);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(report.splitSection.leftRows[0]?.label || '', margin + 8, y + 16);

    pdf.roundedRect(margin + leftColWidth + 10, y, rightColWidth, 22, 2, 2, 'D');
    (report.splitSection.rightRows || []).forEach((entry, i) => {
      const ry = y + 8 + i * 8;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text(entry.label, margin + leftColWidth + 18, ry);
      pdf.setTextColor(23, 23, 23);
      pdf.setFont('helvetica', 'bold');
      pdf.text(entry.value, margin + leftColWidth + 55, ry);
    });

    y += 30;
  }

  // ── WHO Table + Recommendations (BMI) ────────────────────────────────────────
  if (report.whoTable) {
    const tableWidth = (pageWidth - margin * 2) * 0.45;
    const recX = margin + tableWidth + 15;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(150, 150, 150);
    pdf.text('WHO CATEGORY REFERENCE', margin, y);
    pdf.text('RECOMMENDATIONS', recX, y);

    const rowHeight = 4.5;
    const startY = y + 4;

    const tableRows = [
      ['Underweight', '< 18.5'],
      ['Normal Weight', '18.5 - 24.9'],
      ['Overweight', '25.0 - 29.9'],
      ['Obesity', '30.0+'],
    ];
    tableRows.forEach((row, i) => {
      const rowY = startY + i * rowHeight;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, rowY, tableWidth, rowHeight, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(row[0], margin + 3, rowY + 3);
      pdf.text(row[1], margin + tableWidth - 15, rowY + 3);
    });

    const tableBottom = startY + tableRows.length * rowHeight;
    let recBottom = startY;

    if (report.recommendations && report.recommendations.length > 0) {
      const recCount = Math.min(report.recommendations.length, 4);
      report.recommendations.slice(0, recCount).forEach((rec, i) => {
        const recY = startY + i * rowHeight;
        pdf.setDrawColor(0, 223, 216);
        pdf.setLineWidth(0.3);
        pdf.line(recX, recY + 3, recX + 1, recY + 4);
        pdf.line(recX + 1, recY + 4, recX + 3, recY + 1.5);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        pdf.text(rec, recX + 5, recY + 3.5);
      });
      recBottom = startY + recCount * rowHeight;
    }

    y = Math.max(tableBottom, recBottom);
  } else if (report.recommendations && report.recommendations.length > 0) {
    y = sectionTitle('RECOMMENDATIONS', y);
    const recCount = Math.min(report.recommendations.length, 5);
    const recRowHeight = 5;
    report.recommendations.slice(0, recCount).forEach((rec, i) => {
      const recY = y + i * recRowHeight;
      pdf.setDrawColor(0, 223, 216);
      pdf.setLineWidth(0.3);
      pdf.line(margin, recY + 3, margin + 1, recY + 4);
      pdf.line(margin + 1, recY + 4, margin + 3, recY + 1.5);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(50, 50, 50);
      pdf.text(rec, margin + 5, recY + 3.5);
    });
    y += recCount * recRowHeight + 4;
  }

  // Footer
  const footerY = pageHeight - 10;
  if (y > footerY) {
    pdf.addPage();
  }
  pdf.setFontSize(7);
  pdf.setTextColor(180, 180, 180);
  pdf.text('Generated by QuickBMICalculator - Your Health Companion', margin, footerY);
  pdf.text(`Report ID: ${reportId}`, pageWidth - margin - 35, footerY);

  pdf.save(`QuickBMICalculator_${report.calculatorType}_Report_${report.profileName.replace(/\s+/g, '_')}.pdf`);
};

// ─── Saved-Report Converter ────────────────────────────────────────────────────
// Routes saved (DB) reports through the same data-driven renderer used by live
// calculators, so all PDF output shares the same layout, suppression, and labels.

const isPresent = (v: any) => v !== undefined && v !== null && v !== '' && v !== '--';

const getUnitLabel = (system: string, weightUnitOther?: string) =>
  system === 'metric' || (system === 'other' && weightUnitOther === 'kg') ? 'kg' : 'lb';

const getCircUnitLabel = (system: string, circumferenceUnitOther?: string) =>
  system === 'metric' || (system === 'other' && circumferenceUnitOther === 'cm') ? 'cm' : 'in';

const activityLabels: Record<string, string> = {
  '1.2': 'SEDENTARY',
  '1.375': 'LIGHTLY ACTIVE',
  '1.55': 'MODERATELY ACTIVE',
  '1.725': 'VERY ACTIVE',
  '1.9': 'EXTRA ACTIVE',
};

const buildProfileHeight = (i: any): string => {
  if (i.feet !== undefined && i.feet !== null && i.feet !== '')
    return `${i.feet || 0}ft ${i.inches || 0}in`;
  const sys = i.system || 'metric';
  if (sys === 'metric' && isPresent(i.height)) return `${i.height}cm`;
  const hUnit = i.heightUnitOther || i.height_unit || (sys === 'us' ? 'in' : 'cm');
  if (hUnit === 'ft+in') return `${i.feet || 0}ft ${i.inches || 0}in`;
  if (isPresent(i.height)) return `${i.height}${hUnit}`;
  return '';
};

const buildProfileWeight = (i: any): string => {
  if (isPresent(i.weight_lb)) return `${i.weight_lb} lb`;
  if (isPresent(i.weight_kg)) return `${i.weight_kg} kg`;
  if (isPresent(i.weight)) {
    const sys = i.system || 'metric';
    const wUnit = i.weightUnitOther || i.weight_unit || (sys === 'us' ? 'lb' : 'kg');
    return `${i.weight} ${wUnit}`;
  }
  return '';
};

export const generateSavedReportPDF = async (data: PDFData) => {
  if (typeof window === 'undefined') return;

  const { profileName, nickname, relation, calculatorType, inputData, resultData, date } = data;
  const i = inputData || {};
  const r = resultData || {};
  const system = i.system || 'metric';
  const unitSystem = system.toUpperCase();

  const massUnit = getUnitLabel(system, i.weightUnitOther);
  const circUnit = getCircUnitLabel(system, i.circumferenceUnitOther || i.circUnit);

  const profileRows: DataDrivenProfileEntry[] = [];
  const heroRows: { label: string; value: string }[] = [];
  const sections: DataDrivenSection[] = [];
  let recommendations: string[] | undefined;
  let barSegments: { color: [number, number, number]; widthPct: number }[] | undefined;
  let barMarkerPct: number | undefined;
  let barMinLabel: string | undefined;
  let barMaxLabel: string | undefined;
  let barLabels: { text: string; pct: number; align?: string }[] | undefined;
  let splitSection: DataDrivenReport['splitSection'] | undefined;
  let whoTable: boolean | undefined;

  const addProfile = (label: string, value: any) => {
    if (isPresent(value)) profileRows.push({ label, value: String(value) });
  };
  const addHero = (label: string, value: string) => heroRows.push({ label, value });
  const addSection = (title: string, rows: DataDrivenSectionRow[], columns = 3) => {
    if (rows.length > 0) sections.push({ title, rows, columns });
  };

  switch (calculatorType) {
    case 'bmi': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      addProfile('ACTIVITY', activityLabels[i.activity] || String(i.activity || '').replace(/_/g, ' ').toUpperCase());
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);
      addProfile('GOAL', i.goal ? String(i.goal).toUpperCase() : '');

      addHero('CURRENT BMI', Number(r.bmi || 0).toFixed(1));
      addHero('CLASSIFICATION', String(r.category || '--'));

      const bmiVal = Number(r.bmi) || 22;
      const bmiPct = Math.min(Math.max(((bmiVal - 15) / 25) * 100, 0), 100);
      barSegments = [
        { color: [0, 112, 243], widthPct: 14 },
        { color: [0, 223, 216], widthPct: 26 },
        { color: [245, 166, 35], widthPct: 20 },
        { color: [255, 0, 0], widthPct: 40 },
      ];
      barMarkerPct = bmiPct;
      barMinLabel = '15';
      barMaxLabel = '40+';
      barLabels = [
        { text: '18.5', pct: 14, align: 'center' },
        { text: '25', pct: 40, align: 'center' },
        { text: '30', pct: 60, align: 'center' },
      ];

      const bmr = Number(r.bmr) || 0;
      const tdee = Number(r.tdee) || Number(r.maintenance) || 0;
      addSection('ENERGY EXPENDITURE PLAN', [
        { label: 'BMR BASE', value: bmr ? `${Math.round(bmr).toLocaleString()} kcal` : '--' },
        { label: 'MAINTENANCE', value: tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--' },
        { label: 'WEIGHT LOSS', value: tdee ? `${Math.round(tdee - 500).toLocaleString()} kcal` : '--', color: '235, 100, 100' },
        { label: 'WEIGHT GAIN', value: tdee ? `${Math.round(tdee + 500).toLocaleString()} kcal` : '--', color: '34, 197, 94' },
      ], 4);

      const cat = String(r.category || 'Normal Weight');
      const isUnderweight = cat.includes('Underweight');
      const isOverweight = cat.includes('Overweight') || cat.includes('Obesity');
      const walkMap: Record<string, { walking: string; steps: string }> = {
        Underweight: { walking: '20-30 min/day', steps: '5,000-7,000 steps/day' },
        'Normal Weight': { walking: '30 min/day', steps: '7,000-8,000 steps/day' },
        Overweight: { walking: '30-45 min/day', steps: '7,000-9,000 steps/day' },
        Obesity: { walking: '30-45 min/day', steps: '9,000+ steps/day' },
      };
      const actKey = isUnderweight ? 'Underweight' : isOverweight ? (cat.includes('Obesity') ? 'Obesity' : 'Overweight') : 'Normal Weight';
      const actData = walkMap[actKey] || walkMap['Normal Weight'];
      const wKg = Number(i.weight_kg || i.weight) || (i.weight_lb ? i.weight_lb / 2.205 : 0);
      const water = Number(r.waterIntake || r.waterGoal) || (wKg ? parseFloat((wKg * 0.033).toFixed(1)) : 0);
      addSection('ACTIVITY & HYDRATION GUIDE', [
        { label: 'WALKING', value: actData.walking },
        { label: 'STEPS / DAY', value: actData.steps },
        { label: 'WATER INTAKE', value: water ? `${water.toFixed(1)} L / day` : '--' },
      ], 3);

      const range = r.healthyRange || r.idealWeightRange || r.range;
      const rLo = range ? (range.min !== undefined ? range.min : range.low) : 0;
      const rHi = range ? (range.max !== undefined ? range.max : range.high) : 0;
      const weightUnit = system === 'us' ? 'lb' : 'kg';
      const rangeVal = rLo && rHi ? `${Number(rLo).toFixed(1)} - ${Number(rHi).toFixed(1)} ${weightUnit}` : '--';
      splitSection = {
        leftTitle: 'HEALTHY WEIGHT RANGE',
        leftRows: [{ label: 'Recommended range for your height', value: rangeVal }],
        rightTitle: 'ADVANCED ANALYTICS',
        rightRows: [
          { label: 'BMI PRIME', value: bmiVal ? (bmiVal / 25).toFixed(2) : '--' },
          { label: 'PONDERAL INDEX', value: Number(r.ponderalIndex || 0) ? Number(r.ponderalIndex).toFixed(1) : '--' },
        ],
      };

      whoTable = true;
      const recsMap: Record<string, string[]> = {
        Underweight: ['Protein-rich foods', 'Strength training 3x/wk', 'Increase calories', 'Eat 5-6 meals/day'],
        'Normal Weight': ['Balanced nutrition', 'Stay active 30 min/day', 'Consistent sleep', 'Stay hydrated'],
        Overweight: ['Walk 30-45 min daily', '7,000-9,000 steps', 'Calorie deficit', 'Reduce processed foods'],
        Obesity: ['Consult specialist', 'Track calories daily', 'Monitor progress', 'Regular activity'],
      };
      recommendations = recsMap[actKey] || recsMap['Normal Weight'];
      break;
    }

    case 'bmr': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      addProfile('ACTIVITY', activityLabels[i.activity] || String(i.activity || '').replace(/_/g, ' ').toUpperCase());
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);
      addProfile('GOAL', i.goal ? String(i.goal).toUpperCase() : '');

      const bmrVal = Number(r.bmr || 0);
      const tdee = Number(r.tdee || r.maintenance || 0);
      addHero('BASAL METABOLIC RATE', bmrVal ? `${Math.round(bmrVal).toLocaleString()} kcal` : '--');
      addHero('TOTAL DAILY EXPENDITURE', tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--');

      const markerPct = String(i.goal || '') === 'loss' ? 16.5 : String(i.goal || '') === 'gain' ? 83.5 : 50;
      barSegments = [
        { color: [0, 112, 243], widthPct: 33.3 },
        { color: [0, 223, 216], widthPct: 33.3 },
        { color: [245, 166, 35], widthPct: 33.4 },
      ];
      barMarkerPct = markerPct;
      barLabels = [
        { text: 'FAT LOSS', pct: 0, align: 'left' },
        { text: 'MAINTENANCE', pct: 33.3, align: 'left' },
        { text: 'WEIGHT GAIN', pct: 66.6, align: 'left' },
      ];

      const goal = String(i.goal || 'maintenance').toLowerCase();
      const cByGoal = r.caloriesByGoal || {};
      const lossVal = Number(cByGoal.loss || 0);
      const gainVal = Number(cByGoal.gain || 0);
      addSection('ENERGY EXPENDITURE PLAN', [
        { label: 'BMR BASE', value: bmrVal ? `${Math.round(bmrVal).toLocaleString()} kcal` : '--' },
        { label: 'MAINTENANCE', value: tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--' },
        { label: 'WEIGHT LOSS', value: lossVal ? `${Math.round(lossVal).toLocaleString()} kcal` : '--', color: '235, 100, 100' },
        { label: 'WEIGHT GAIN', value: gainVal ? `${Math.round(gainVal).toLocaleString()} kcal` : '--', color: '34, 197, 94' },
      ], 4);

      const wKg = Number(i.weight_kg || i.weight) || (i.weight_lb ? i.weight_lb / 2.205 : 0);
      const water = Number(r.waterIntake || r.waterGoal) || (wKg ? parseFloat((wKg * 0.033).toFixed(1)) : 0);
      addSection('ACTIVITY & HYDRATION GUIDE', [
        { label: 'WALKING', value: (r.suggestedActivity && r.suggestedActivity.walking) ? r.suggestedActivity.walking : '30 min/day' },
        { label: 'STEPS / DAY', value: (r.suggestedActivity && r.suggestedActivity.steps) ? r.suggestedActivity.steps : '7,000-8,000 steps/day' },
        { label: 'WATER INTAKE', value: water ? `${water.toFixed(1)} L / day` : '--' },
      ], 3);

      if (r.recommendations) recommendations = r.recommendations;
      break;
    }

    case 'body_fat': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);

      addHero('BODY FAT PERCENTAGE', `${Number(r.bodyFat || 0).toFixed(1)}%`);
      addHero('CLASSIFICATION', String(r.category || '--'));

      const bf = Number(r.bodyFat) || 22;
      const bfPct = Math.min(Math.max(((bf - 5) / 35) * 100, 0), 100);
      barSegments = [
        { color: [0, 112, 243], widthPct: 14 },
        { color: [0, 223, 216], widthPct: 26 },
        { color: [245, 166, 35], widthPct: 20 },
        { color: [255, 0, 0], widthPct: 40 },
      ];
      barMarkerPct = bfPct;
      barMinLabel = '5';
      barMaxLabel = '40+';
      barLabels = [
        { text: '14', pct: 14, align: 'center' },
        { text: '21', pct: 40, align: 'center' },
        { text: '25', pct: 60, align: 'center' },
      ];

      const leanVal = Number(r.leanMass || r.leanMassVal || 0);
      const fatVal = Number(r.fatMass || r.fatMassVal || 0);
      if (leanVal || fatVal) {
        addSection('BODY COMPOSITION', [
          { label: 'LEAN MASS', value: `${leanVal.toFixed(1)} ${massUnit}` },
          { label: 'FAT MASS', value: `${fatVal.toFixed(1)} ${massUnit}` },
        ], 2);
      }

      const circRows: DataDrivenSectionRow[] = [];
      if (isPresent(i.neck)) circRows.push({ label: 'NECK', value: `${i.neck} ${circUnit}` });
      if (isPresent(i.waist)) circRows.push({ label: 'WAIST', value: `${i.waist} ${circUnit}` });
      if (isPresent(i.hips)) circRows.push({ label: 'HIPS', value: `${i.hips} ${circUnit}` });
      if (circRows.length > 0) addSection('CIRCUMFERENCE MEASUREMENTS', circRows, 3);
      break;
    }

    case 'lean_body_mass': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);

      const leanMassVal = Number(r.leanMass || 0);
      const leanMassPctVal = Number(r.leanMassPct || 0);
      addHero('LEAN BODY MASS', `${leanMassVal.toFixed(1)} ${massUnit}`);
      addHero('METHODOLOGY', String(r.method || '--').toUpperCase());

      if (leanMassPctVal > 0) {
        barSegments = [
          { color: [132, 204, 22], widthPct: leanMassPctVal },
          { color: [245, 166, 35], widthPct: 100 - leanMassPctVal },
        ];
        barMarkerPct = leanMassPctVal;
        barMinLabel = '0%';
        barMaxLabel = '100%';
        barLabels = [
          { text: `LEAN ${leanMassPctVal.toFixed(1)}%`, pct: leanMassPctVal / 2, align: 'center' },
          { text: `FAT ${(100 - leanMassPctVal).toFixed(1)}%`, pct: leanMassPctVal + (100 - leanMassPctVal) / 2, align: 'center' },
        ];
      }

      const boer = Number(r.boerLBM || r.boerDisplay || 0);
      const james = Number(r.jamesLBM || r.jamesDisplay || 0);
      const hume = Number(r.humeLBM || r.humeDisplay || 0);
      if (boer || james || hume) {
        addSection('LBM FORMULAS COMPARISON', [
          { label: 'BOER FORMULA', value: `${boer.toFixed(1)} ${massUnit}` },
          { label: 'JAMES FORMULA', value: `${james.toFixed(1)} ${massUnit}` },
          { label: 'HUME FORMULA', value: `${hume.toFixed(1)} ${massUnit}` },
        ], 3);
      }

      const leanM = Number(r.leanMass || 0);
      const fatM = Number(r.fatMass || 0);
      const leanPct = Number(r.leanMassPct || 0);
      const fatPctVal = Number(r.fatMassPct || 0);
      if (leanM || fatM) {
        addSection('BODY COMPOSITION', [
          { label: 'LEAN MASS', value: `${leanM.toFixed(1)} ${massUnit}` },
          { label: 'FAT MASS', value: `${fatM.toFixed(1)} ${massUnit}` },
          { label: 'LEAN MASS %', value: leanPct ? `${leanPct.toFixed(1)}%` : '--' },
          { label: 'FAT MASS %', value: fatPctVal ? `${fatPctVal.toFixed(1)}%` : '--' },
        ], 2);
      }

      if (isPresent(r.customBodyFat) || isPresent(i.customBodyFat)) {
        const bfVal = r.customBodyFat || i.customBodyFat;
        addSection('CUSTOM BODY FAT', [
          { label: 'USER ENTERED BF%', value: `${bfVal}%` },
        ], 1);
      }
      break;
    }

    case 'calorie': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      addProfile('ACTIVITY', activityLabels[i.activity] || String(i.activity || '').replace(/_/g, ' ').toUpperCase());
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);
      addProfile('GOAL', i.goal ? String(i.goal).toUpperCase() : '');

      const goal = String(i.goal || 'maintenance').toLowerCase();
      const target = Number(r.targetCalories || r.maintenance || 0);
      addHero('TARGET DAILY CALORIES', target ? `${Math.round(target).toLocaleString()} kcal` : '--');
      addHero('SELECTED GOAL', goal.toUpperCase());

      const markerPct = goal === 'loss' ? 16.5 : goal === 'gain' ? 83.5 : 50;
      barSegments = [
        { color: [0, 112, 243], widthPct: 33.3 },
        { color: [0, 223, 216], widthPct: 33.3 },
        { color: [245, 166, 35], widthPct: 33.4 },
      ];
      barMarkerPct = markerPct;
      barLabels = [
        { text: 'FAT LOSS', pct: 0, align: 'left' },
        { text: 'MAINTENANCE', pct: 33.3, align: 'left' },
        { text: 'WEIGHT GAIN', pct: 66.6, align: 'left' },
      ];

      const bmr = Number(r.bmr || 0);
      const tdee = Number(r.tdee || r.maintenance || 0);
      const cByGoal = r.caloriesByGoal || {};
      addSection('ENERGY EXPENDITURE PLAN', [
        { label: 'BMR BASE', value: bmr ? `${Math.round(bmr).toLocaleString()} kcal` : '--' },
        { label: 'MAINTENANCE', value: tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--' },
        { label: 'WEIGHT LOSS', value: cByGoal.loss ? `${Math.round(cByGoal.loss).toLocaleString()} kcal` : '--', color: '235, 100, 100' },
        { label: 'WEIGHT GAIN', value: cByGoal.gain ? `${Math.round(cByGoal.gain).toLocaleString()} kcal` : '--', color: '34, 197, 94' },
      ], 4);

      const cat = String(r.category || 'Normal Weight');
      const isUnderweight = cat.includes('Underweight');
      const isOverweight = cat.includes('Overweight') || cat.includes('Obesity');
      const walkMap: Record<string, { walking: string; steps: string }> = {
        Underweight: { walking: '20-30 min/day', steps: '5,000-7,000 steps/day' },
        'Normal Weight': { walking: '30 min/day', steps: '7,000-8,000 steps/day' },
        Overweight: { walking: '30-45 min/day', steps: '7,000-9,000 steps/day' },
        Obesity: { walking: '30-45 min/day', steps: '9,000+ steps/day' },
      };
      const actKey = isUnderweight ? 'Underweight' : isOverweight ? (cat.includes('Obesity') ? 'Obesity' : 'Overweight') : 'Normal Weight';
      const actData = walkMap[actKey] || walkMap['Normal Weight'];
      const wKg = Number(i.weight_kg || i.weight) || (i.weight_lb ? i.weight_lb / 2.205 : 0);
      const water = Number(r.waterIntake || r.waterGoal) || (wKg ? parseFloat((wKg * 0.033).toFixed(1)) : 0);
      addSection('ACTIVITY & HYDRATION GUIDE', [
        { label: 'WALKING', value: actData.walking },
        { label: 'STEPS / DAY', value: actData.steps },
        { label: 'WATER INTAKE', value: water ? `${water.toFixed(1)} L / day` : '--' },
      ], 3);

      if (r.recommendations) recommendations = r.recommendations;
      break;
    }

    case 'macro': {
      if (isPresent(i.calories)) addProfile('CALORIES', `${parseInt(i.calories).toLocaleString()} kcal`);
      if (isPresent(i.preset)) {
        const presetLabels: Record<string, string> = {
          balanced: 'BALANCED',
          low_carb: 'LOW CARB',
          high_protein: 'HIGH PROTEIN',
          keto: 'KETO',
        };
        addProfile('PRESET', presetLabels[String(i.preset).toLowerCase()] || String(i.preset).toUpperCase());
      }

      const cG = Number(r.carbsGrams || 0);
      const pG = Number(r.proteinGrams || 0);
      const fG = Number(r.fatGrams || 0);
      addHero('MACRONUTRIENTS (C/P/F)', cG || pG || fG ? `${Math.round(cG)}g / ${Math.round(pG)}g / ${Math.round(fG)}g` : '--');
      const dietLabel = r.dietLabel || String(i.preset || 'custom').toUpperCase();
      addHero('DIET PROFILE', dietLabel);

      const cPct = Number(r.carbsPct || 0);
      const pPct = Number(r.proteinPct || 0);
      const fPct = Number(r.fatPct || 0);
      if (cPct + pPct + fPct > 0) {
        barSegments = [
          { color: [251, 191, 36], widthPct: cPct },
          { color: [52, 211, 153], widthPct: pPct },
          { color: [248, 113, 113], widthPct: fPct },
        ];
        barMarkerPct = cPct;
        barLabels = [
          { text: `CARBS ${cPct}%`, pct: cPct / 2, align: 'center' },
          { text: `PROTEIN ${pPct}%`, pct: cPct + pPct / 2, align: 'center' },
          { text: `FAT ${fPct}%`, pct: cPct + pPct + fPct / 2, align: 'center' },
        ];
      }

      addSection('CALORIE BREAKDOWN', [
        { label: 'CARBS', value: Number(r.carbsCalories || 0) ? `${Math.round(Number(r.carbsCalories))} kcal` : '--' },
        { label: 'PROTEIN', value: Number(r.proteinCalories || 0) ? `${Math.round(Number(r.proteinCalories))} kcal` : '--' },
        { label: 'FAT', value: Number(r.fatCalories || 0) ? `${Math.round(Number(r.fatCalories))} kcal` : '--' },
      ], 3);

      addSection('PERCENTAGE SPLIT', [
        { label: 'CARBS', value: isPresent(r.carbsPct) ? `${r.carbsPct}%` : '--' },
        { label: 'PROTEIN', value: isPresent(r.proteinPct) ? `${r.proteinPct}%` : '--' },
        { label: 'FAT', value: isPresent(r.fatPct) ? `${r.fatPct}%` : '--' },
      ], 3);
      break;
    }

    case 'protein_intake': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);
      addProfile('ACTIVITY', activityLabels[i.activity] || String(i.activity || '').replace(/_/g, ' ').toUpperCase());
      addProfile('GOAL', i.goal ? String(i.goal).toUpperCase() : '');

      addHero('PROTEIN REQUIREMENT', Number(r.proteinGoal || 0) ? `${Math.round(Number(r.proteinGoal))} g/day` : '--');
      addHero('CALORIE SHARE', Number(r.proteinCalories || 0) ? `${Math.round(Number(r.proteinCalories))} kcal` : '--');

      const pRange = r.proteinRange || {};
      addSection('PROTEIN RANGE', [
        { label: 'MINIMUM', value: isPresent(pRange.min) ? `${Math.round(pRange.min)} g/day` : '--' },
        { label: 'MAXIMUM', value: isPresent(pRange.max) ? `${Math.round(pRange.max)} g/day` : '--' },
      ], 2);

      if (isPresent(r.multiplier)) {
        addSection('MULTIPLIER', [
          { label: 'ACTIVITY FACTOR', value: `${Number(r.multiplier).toFixed(2)} g/kg` },
        ], 1);
      }
      break;
    }

    case 'ideal_weight': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);

      const idealWt = Number(r.idealWeight || r.ideal_weight || 0);
      const idealLb = idealWt / 0.45359237;
      addHero('IDEAL WEIGHT (DEVINE)', idealWt ? `${idealWt.toFixed(1)} kg / ${idealLb.toFixed(1)} lb` : '--');

      const weightKg = Number(i.weight_kg || i.weight) || (i.weight_lb ? i.weight_lb / 2.205 : 0);
      let heightCm = 0;
      if (i.height_cm) heightCm = Number(i.height_cm);
      else if (i.feet !== undefined) heightCm = ((Number(i.feet) || 0) * 12 + (Number(i.inches) || 0)) * 2.54;
      else if (i.height) heightCm = Number(i.height);
      const estimatedBmi = weightKg > 0 && heightCm > 0 ? weightKg / ((heightCm / 100) ** 2) : 0;
      const bmiPct = estimatedBmi > 0 ? Math.min(Math.max(((estimatedBmi - 15) / 25) * 100, 0), 100) : 50;
      barSegments = [
        { color: [0, 112, 243], widthPct: 14 },
        { color: [0, 223, 216], widthPct: 26 },
        { color: [245, 166, 35], widthPct: 20 },
        { color: [255, 0, 0], widthPct: 40 },
      ];
      barMarkerPct = bmiPct;
      barMinLabel = '15';
      barMaxLabel = '40+';
      barLabels = [
        { text: '18.5', pct: 14, align: 'center' },
        { text: '25', pct: 40, align: 'center' },
        { text: '30', pct: 60, align: 'center' },
      ];

      const wIntake = Number(r.waterIntake || 0);
      addSection('DAILY WATER INTAKE', [
        { label: 'WATER', value: wIntake ? `${wIntake.toFixed(1)} L / day` : '--' },
      ], 1);

      const range = r.healthyRange || r.idealWeightRange || r.range;
      const rLo = range ? (range.min !== undefined ? range.min : range.low) : 0;
      const rHi = range ? (range.max !== undefined ? range.max : range.high) : 0;
      const rangeUnit = system === 'us' || (system === 'other' && i.weightUnitOther === 'lb') ? 'lb' : 'kg';
      const rangeVal = rLo && rHi ? `${Number(rLo).toFixed(1)} - ${Number(rHi).toFixed(1)} ${rangeUnit}` : '--';
      splitSection = {
        leftTitle: 'HEALTHY WEIGHT RANGE',
        leftRows: [{ label: 'Recommended range for your height', value: rangeVal }],
      };

      if (r.recommendations) recommendations = r.recommendations;
      break;
    }

    case 'water_intake': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);
      addProfile('ACTIVITY', activityLabels[i.activity] || String(i.activity || '').replace(/_/g, ' ').toUpperCase());
      addProfile('CLIMATE', i.climate ? String(i.climate).toUpperCase() : '');

      const waterGoalVal = Number(r.waterGoal || r.waterIntake || 0);
      addHero('DAILY WATER REQUIREMENT', waterGoalVal ? `${waterGoalVal.toFixed(1)} Liters` : '--');
      if (isPresent(r.hydrationStatus)) addHero('HYDRATION STATUS', String(r.hydrationStatus).toUpperCase());

      if (waterGoalVal > 0) {
        barSegments = [
          { color: [0, 112, 243], widthPct: 30 },
          { color: [0, 223, 216], widthPct: 40 },
          { color: [245, 166, 35], widthPct: 30 },
        ];
        barMarkerPct = Math.min(Math.max(((waterGoalVal - 1) / (5 - 1)) * 100, 0), 100);
        barLabels = [
          { text: 'LOW INTAKE', pct: 0, align: 'left' },
          { text: 'NORMAL TARGET', pct: 30, align: 'left' },
          { text: 'HIGH HYDRATION', pct: 70, align: 'left' },
        ];
      }

      if (i.activity || i.climate) {
        addSection('CLIMATE & ACTIVITY ADJUSTMENT', [
          { label: 'ACTIVITY', value: i.activity ? `${activityLabels[i.activity] || i.activity} (+${i.activity || 0}ml)` : '--' },
          { label: 'CLIMATE', value: i.climate ? `${String(i.climate).toUpperCase()} (+${i.climate || 0}ml)` : '--' },
        ], 2);
      }

      const timings = r.recommendedBreakdown || r.timings || {};
      if (timings.morning || timings.afternoon || timings.night || timings.workout) {
        addSection('DAILY HYDRATION TIMINGS', [
          { label: 'MORNING (25%)', value: `${(timings.morning || 0).toFixed(1)} L` },
          { label: 'AFTERNOON (40%)', value: `${(timings.afternoon || 0).toFixed(1)} L` },
          { label: 'EVENING (20%)', value: `${(timings.night || 0).toFixed(1)} L` },
          { label: 'WORKOUT (15%)', value: `${(timings.workout || 0).toFixed(1)} L` },
        ], 2);
      }

      if (r.recommendations) recommendations = r.recommendations;
      break;
    }

    case 'daily_nutrition': {
      addProfile('AGE', i.age ? `${i.age} YRS` : '');
      addProfile('GENDER', i.gender ? String(i.gender).toUpperCase() : '');
      addProfile('ACTIVITY', activityLabels[i.activity] || String(i.activity || '').replace(/_/g, ' ').toUpperCase());
      const h = buildProfileHeight(i);
      if (h) addProfile('HEIGHT', h);
      const w = buildProfileWeight(i);
      if (w) addProfile('WEIGHT', w);
      addProfile('GOAL', i.goal ? String(i.goal).toUpperCase() : '');
      if (i.rate) {
        const isLb = system === 'us' || (system === 'other' && i.weightUnitOther === 'lb');
        const rateLabels: Record<string, string> = { '0.25': '0.5', '0.5': '1.0', '1.0': '2.0' };
        const rateDisplay = isLb ? `${rateLabels[i.rate] || i.rate} LB/WK` : `${i.rate} KG/WK`;
        addProfile('RATE', rateDisplay);
      }

      const targetCals = Number(r.targetCalories || 0);
      const tdee = Number(r.tdee || 0);
      addHero('DAILY CALORIE BUDGET', targetCals ? `${Math.round(targetCals).toLocaleString()} kcal` : '--');
      addHero('TDEE (MAINTENANCE)', tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--');

      const bmr = Number(r.bmr || 0);
      addSection('ENERGY EXPENDITURE PLAN', [
        { label: 'BMR BASE', value: bmr ? `${Math.round(bmr).toLocaleString()} kcal` : '--' },
        { label: 'MAINTENANCE', value: tdee ? `${Math.round(tdee).toLocaleString()} kcal` : '--' },
        { label: 'WEIGHT LOSS', value: tdee ? `${Math.round(tdee - 500).toLocaleString()} kcal` : '--', color: '235, 100, 100' },
        { label: 'WEIGHT GAIN', value: tdee ? `${Math.round(tdee + 500).toLocaleString()} kcal` : '--', color: '34, 197, 94' },
      ], 4);

      addSection('MACRONUTRIENT BREAKDOWN', [
        { label: 'PROTEIN', value: Number(r.proteinGrams || 0) ? `${Math.round(Number(r.proteinGrams))}g` : '--' },
        { label: 'CARBOHYDRATES', value: Number(r.carbsGrams || 0) ? `${Math.round(Number(r.carbsGrams))}g` : '--' },
        { label: 'DIETARY FATS', value: Number(r.fatGrams || 0) ? `${Math.round(Number(r.fatGrams))}g` : '--' },
        { label: 'DAILY ADJUSTMENT', value: isPresent(r.dailyAdjustment) ? `${Number(r.dailyAdjustment) > 0 ? '+' : ''}${Math.round(Number(r.dailyAdjustment))} kcal` : '--' },
      ], 4);

      if (r.isFloorTriggered) {
        addSection('SAFETY LIMIT ACTIVE', [
          { label: 'STATUS', value: 'Calorie floor applied — minimum safe intake enforced', color: '245, 166, 35' },
        ], 1);
      }

      recommendations = [
        'Maintain balanced nutrition',
        'Stay active daily',
        'Keep consistent sleep schedule',
        'Track progress monthly',
      ];
      break;
    }

    default:
      return;
  }

  await generateDataDrivenReport({
    profileName: profileName || 'Valued User',
    nickname,
    relation,
    calculatorType,
    date,
    unitSystem,
    profileRows,
    heroRows,
    barSegments,
    barMarkerPct,
    barMinLabel,
    barMaxLabel,
    barLabels,
    sections,
    splitSection,
    whoTable,
    recommendations,
  });
};
