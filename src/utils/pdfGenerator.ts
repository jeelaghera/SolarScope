import jsPDF from 'jspdf';
import type { FinancialResult, GenerationResult, SizingResult } from './solarCalculator';

export interface ReportData {
  address: string;
  state: string;
  monthlyBill: number;
  monthlyUnits: number;
  sizing: SizingResult;
  generation: GenerationResult;
  financials: FinancialResult;
  tariff: number;
  costPerKw: number;
}

export function generatePdfReport(data: ReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Background Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Amber Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Brand Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLARSCOPE', 18, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('Rooftop Solar Feasibility & PM Surya Ghar Subsidy Assessment', 18, 25);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated on: ${dateStr}  |  NASA POWER Climatology  |  PM Surya Ghar 2026`, 18, 33);

  y = 52;

  // Site Information Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SITE & CONSUMPTION PROFILE', 20, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const truncatedAddr = data.address.length > 85 ? data.address.substring(0, 85) + '...' : data.address;
  doc.text(`Location: ${truncatedAddr}`, 20, y + 12);
  doc.text(
    `State: ${data.state}   |   Monthly Bill: ~Rs ${data.monthlyBill.toLocaleString('en-IN')}   |   Monthly Units: ${data.monthlyUnits} kWh   |   Tariff: Rs ${data.tariff}/kWh`,
    20,
    y + 17
  );

  y += 30;

  // Key System Sizing & Economics Summary Cards (3 Columns)
  const colWidth = (pageWidth - 40) / 3;

  // Card 1: Recommended Capacity
  drawMetricCard(
    doc,
    15,
    y,
    colWidth,
    28,
    'RECOMMENDED SYSTEM',
    `${data.sizing.recommendedCapacityKw} kWp`,
    `Roof Area: ${data.sizing.roofAreaSqMeters} m² (${data.sizing.usableRoofAreaSqMeters} m² usable)`,
    [245, 158, 11]
  );

  // Card 2: Net Investment
  drawMetricCard(
    doc,
    15 + colWidth + 5,
    y,
    colWidth,
    28,
    'NET UPFRONT OUTLAY',
    `Rs ${data.financials.netInvestment.toLocaleString('en-IN')}`,
    `Gross: Rs ${data.financials.grossCost.toLocaleString('en-IN')} - Subsidy: Rs ${data.financials.totalSubsidy.toLocaleString('en-IN')}`,
    [16, 185, 129]
  );

  // Card 3: Payback
  drawMetricCard(
    doc,
    15 + (colWidth + 5) * 2,
    y,
    colWidth,
    28,
    'PAYBACK PERIOD',
    `~${data.financials.paybackYears} Years`,
    `${data.financials.paybackMonths} Months Break-even`,
    [14, 165, 233]
  );

  y += 36;

  // PM Surya Ghar Subsidy Breakdown Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PM Surya Ghar: Muft Bijli Yojana Subsidy Breakdown', 15, y);

  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Component', 20, y + 5);
  doc.text('Calculated Value', pageWidth - 65, y + 5);

  const subsidyRows = [
    ['Total Benchmark System Cost (Rs 60,000/kW)', `Rs ${data.financials.grossCost.toLocaleString('en-IN')}`],
    ['PM Surya Ghar Central DBT Subsidy (Capped at Rs 78,000)', `- Rs ${data.financials.centralSubsidy.toLocaleString('en-IN')}`],
    ['State Renewable Subsidy Top-up', `- Rs ${data.financials.stateSubsidy.toLocaleString('en-IN')}`],
    ['Total Government Subsidy Benefit', `Rs ${data.financials.totalSubsidy.toLocaleString('en-IN')}`],
    ['Net Capital Cost Paid by Homeowner', `Rs ${data.financials.netInvestment.toLocaleString('en-IN')}`],
  ];

  y += 7;
  doc.setFont('helvetica', 'normal');
  subsidyRows.forEach(([title, val], idx) => {
    const isTotal = idx === subsidyRows.length - 1;
    if (isTotal) {
      doc.setFillColor(254, 243, 199);
      doc.rect(15, y, pageWidth - 30, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
    } else {
      if (idx % 2 === 1) doc.setFillColor(250, 250, 250);
      else doc.setFillColor(255, 255, 255);
      doc.rect(15, y, pageWidth - 30, 6, 'F');
      doc.setTextColor(71, 85, 105);
    }
    doc.text(title, 20, y + (isTotal ? 5 : 4.5));
    doc.text(val, pageWidth - 65, y + (isTotal ? 5 : 4.5));
    y += isTotal ? 7 : 6;
  });

  y += 8;

  // 25-Year Long-Term Financial & Environmental Impact Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('25-Year Lifetime Returns & Environmental Impact', 15, y);

  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Metric', 20, y + 5);
  doc.text('25-Year Projection', pageWidth - 65, y + 5);

  const returnRows = [
    ['First Year Solar Energy Yield', `${data.generation.annualKwh.toLocaleString('en-IN')} kWh`],
    ['Lifetime Solar Generation (0.5% degradation/yr)', `${data.financials.lifetimeGenerationKwh.toLocaleString('en-IN')} kWh`],
    ['First Year Electricity Bill Savings', `Rs ${data.generation.annualSavings.toLocaleString('en-IN')}`],
    ['Cumulative 25-Year Bill Savings (3% tariff rise/yr)', `Rs ${data.financials.lifetimeSavings.toLocaleString('en-IN')}`],
    ['Net Lifetime Profit (Savings minus Net Cost)', `Rs ${data.financials.netLifetimeProfit.toLocaleString('en-IN')}`],
    ['Return on Investment (ROI)', `${data.financials.roiPercent}%`],
    ['Total Clean Energy CO2 Avoided', `${data.financials.totalCo2AvoidedTonnes} Tonnes`],
    ['Equivalent Trees Planted for Carbon Sequestration', `~${data.financials.treesPlantedEquivalent} Mature Trees`],
  ];

  y += 7;
  doc.setFont('helvetica', 'normal');
  returnRows.forEach(([title, val], idx) => {
    if (idx % 2 === 1) doc.setFillColor(250, 250, 250);
    else doc.setFillColor(255, 255, 255);
    doc.rect(15, y, pageWidth - 30, 6, 'F');
    doc.setTextColor(71, 85, 105);
    doc.text(title, 20, y + 4.5);
    doc.setFont('helvetica', idx >= 4 ? 'bold' : 'normal');
    doc.text(val, pageWidth - 65, y + 4.5);
    doc.setFont('helvetica', 'normal');
    y += 6;
  });

  y += 8;

  // Next Steps Checklist
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(15, y, pageWidth - 30, 24, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('NEXT STEPS TO CLAIM PM SURYA GHAR SUBSIDY', 20, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text('1. Register on pmsuryaghar.gov.in with your Electricity Consumer Number (CA/Consumer ID).', 20, y + 11);
  doc.text('2. Choose an MNRE registered solar vendor in your DISCOM area to submit technical feasibility.', 20, y + 16);
  doc.text('3. Commission system, inspect net meter, and receive DBT subsidy in your Aadhaar-linked bank account.', 20, y + 21);

  // Footer Disclaimer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Disclaimer: SolarScope estimates are based on NASA POWER climatology and standard PV degradation models. Actual solar generation is subject to local shading, orientation, and DISCOM grid availability.',
    15,
    pageWidth > 200 ? 285 : 280
  );

  // Save the PDF
  const filename = `SolarScope_Report_${data.sizing.recommendedCapacityKw}kWp_${Date.now()}.pdf`;
  doc.save(filename);
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  val: string,
  sub: string,
  accentRgb: [number, number, number]
) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Top color line
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(x, y, w, 1.5, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + 4, y + 7);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(val, x + 4, y + 16);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const truncatedSub = sub.length > 32 ? sub.substring(0, 32) + '...' : sub;
  doc.text(truncatedSub, x + 4, y + 23);
}
