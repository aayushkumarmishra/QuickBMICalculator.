import type { jsPDF } from 'jspdf';

export interface PDFData {
  profileName: string;
  nickname?: string;
  relation?: string;
  calculatorType: 'bmi' | 'bmr' | 'calorie' | 'ideal_weight' | 'water_intake';
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
    m.height = `${input.height}${input.height_unit || (system === 'us' ? 'in' : 'cm')}`;
  } else {
    m.height = '--';
  }

  // 5. Weight
  if (input.weight_lb) {
    m.weight = `${input.weight_lb} lb`;
  } else if (input.weight_kg) {
    m.weight = `${input.weight_kg} kg`;
  } else if (input.weight) {
    m.weight = `${input.weight} ${input.weight_unit || (system === 'us' ? 'lb' : 'kg')}`;
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
  pdf.text('QuickBMI', margin, 20);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(180, 180, 180);
  const typeLabels: Record<string, string> = {
    bmi: 'Professional Biometric Analysis',
    bmr: 'Basal Metabolic Rate Analysis',
    calorie: 'Daily Calorie Requirements',
    ideal_weight: 'Ideal Weight Analysis',
    water_intake: 'Hydration Requirements'
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
  }

  y += 30;

  // 4. Visual Bar Section
  const barHeight = 8;
  const barWidth = pageWidth - (margin * 2);

  if (data.calculatorType === 'bmi' || data.calculatorType === 'ideal_weight') {
    // BMI/Weight Zones
    pdf.setFillColor(0, 112, 243); pdf.rect(margin, y, barWidth * 0.14, barHeight, 'F');
    pdf.setFillColor(0, 223, 216); pdf.rect(margin + (barWidth * 0.14), y, barWidth * 0.26, barHeight, 'F');
    pdf.setFillColor(245, 166, 35); pdf.rect(margin + (barWidth * 0.40), y, barWidth * 0.20, barHeight, 'F');
    pdf.setFillColor(255, 0, 0); pdf.rect(margin + (barWidth * 0.60), y, barWidth * 0.40, barHeight, 'F');

    const bmi = Number(rData.bmi || (rData.idealWeight ? 22 : 0));
    const pct = Math.min(Math.max(((bmi - 15) / (40 - 15)) * 100, 0), 100);
    const markerX = margin + (barWidth * (pct / 100));

    pdf.setDrawColor(23, 23, 23); pdf.setLineWidth(0.6);
    pdf.line(markerX, y - 2, markerX, y + barHeight + 2);
    pdf.setFillColor(23, 23, 23); pdf.circle(markerX, y - 3, 1.2, 'FD');

    pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
    pdf.text('15', margin, y + barHeight + 5);
    pdf.text('18.5', margin + (barWidth * 0.14), y + barHeight + 5, { align: 'center' });
    pdf.text('25', margin + (barWidth * 0.40), y + barHeight + 5, { align: 'center' });
    pdf.text('30', margin + (barWidth * 0.60), y + barHeight + 5, { align: 'center' });
    pdf.text('40+', margin + barWidth, y + barHeight + 5, { align: 'right' });
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
  pdf.text('Generated by QuickBMI.com - Your Health Companion', margin, pageHeight - 10);
  pdf.text(`Report ID: ${reportId}`, pageWidth - margin - 35, pageHeight - 10);

  pdf.save(`QuickBMI_${data.calculatorType}_Report_${data.profileName.replace(/\s+/g, '_')}.pdf`);
};
