import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const subjects = [
  {
    name: "AP Macroeconomics",
    code: "AP_MACRO",
    description: "College Board AP Macroeconomics — covers national income, economic growth, business cycles, money and banking, monetary and fiscal policy.",
    country: "US",
    examBoard: "College Board",
    color: "#3b82f6",
    sortOrder: 1,
    topics: [
      "Basic Economic Concepts",
      "Measurement of Economic Performance",
      "National Income and Price Determination",
      "Financial Sector",
      "Long-Run Consequences of Stabilization Policies",
      "Open Economy: International Trade and Finance",
    ],
  },
  {
    name: "AP Microeconomics",
    code: "AP_MICRO",
    description: "College Board AP Microeconomics — covers supply and demand, consumer and producer theory, market structures, factor markets.",
    country: "US",
    examBoard: "College Board",
    color: "#8b5cf6",
    sortOrder: 2,
    topics: [
      "Basic Economic Concepts",
      "Supply and Demand",
      "Production, Cost, and the Perfect Competition Model",
      "Imperfect Competition",
      "Factor Markets",
      "Market Failure and the Role of Government",
    ],
  },
  {
    name: "SAT Math",
    code: "SAT_MATH",
    description: "College Board SAT Math — covers algebra, advanced math, problem solving and data analysis, geometry and trigonometry.",
    country: "US",
    examBoard: "College Board",
    color: "#10b981",
    sortOrder: 3,
    topics: [
      "Algebra",
      "Advanced Math",
      "Problem Solving and Data Analysis",
      "Geometry and Trigonometry",
    ],
  },
  {
    name: "SAT Reading & Writing",
    code: "SAT_RW",
    description: "College Board SAT Reading & Writing — covers information and ideas, craft and structure, expression of ideas, standard English conventions.",
    country: "US",
    examBoard: "College Board",
    color: "#f59e0b",
    sortOrder: 4,
    topics: [
      "Information and Ideas",
      "Craft and Structure",
      "Expression of Ideas",
      "Standard English Conventions",
    ],
  },
  {
    name: "NSW Mathematics Advanced",
    code: "NSW_MATHS_ADV",
    description: "NESA NSW Year 11-12 Mathematics Advanced — covers functions, trigonometry, calculus, statistical analysis.",
    country: "AU",
    examBoard: "NESA",
    color: "#ef4444",
    sortOrder: 5,
    topics: [
      "Functions",
      "Trigonometric Functions",
      "Calculus",
      "Exponential and Logarithmic Functions",
      "Statistical Analysis",
      "Financial Mathematics",
    ],
  },
  {
    name: "NSW English Advanced",
    code: "NSW_ENG_ADV",
    description: "NESA NSW Year 11-12 English Advanced — covers reading to write, close study of literature, craft of writing, texts and human experiences.",
    country: "AU",
    examBoard: "NESA",
    color: "#ec4899",
    sortOrder: 6,
    topics: [
      "Reading to Write",
      "Close Study of Literature",
      "Craft of Writing",
      "Texts and Human Experiences",
    ],
  },
  {
    name: "NSW Chemistry",
    code: "NSW_CHEM",
    description: "NESA NSW Year 11-12 Chemistry — covers properties and structure of matter, introduction to quantitative chemistry, reactive chemistry, drivers of reactions.",
    country: "AU",
    examBoard: "NESA",
    color: "#06b6d4",
    sortOrder: 7,
    topics: [
      "Properties and Structure of Matter",
      "Introduction to Quantitative Chemistry",
      "Reactive Chemistry",
      "Drivers of Reactions",
      "Equilibrium and Acid Reactions",
      "Organic Chemistry",
    ],
  },
  {
    name: "NSW Physics",
    code: "NSW_PHYS",
    description: "NESA NSW Year 11-12 Physics — covers kinematics, dynamics, waves, thermodynamics, electricity, magnetism, and modern physics.",
    country: "AU",
    examBoard: "NESA",
    color: "#84cc16",
    sortOrder: 8,
    topics: [
      "Kinematics",
      "Dynamics",
      "Waves and Thermodynamics",
      "Electricity and Magnetism",
      "Advanced Mechanics",
      "Electromagnetism",
      "The Nature of Light",
      "From the Universe to the Atom",
    ],
  },
  {
    name: "NSW Biology",
    code: "NSW_BIO",
    description: "NESA NSW Year 11-12 Biology — covers cell biology, genetics, evolution, ecosystems.",
    country: "AU",
    examBoard: "NESA",
    color: "#22c55e",
    sortOrder: 9,
    topics: [
      "Cells as the Basis of Life",
      "Organisation of Living Things",
      "Biological Diversity",
      "Ecosystem Dynamics",
      "Heredity",
      "Genetic Change",
      "Infectious Disease",
    ],
  },
  {
    name: "NSW Economics",
    code: "NSW_ECON",
    description: "NESA NSW Year 11-12 Economics — covers introduction to economics, consumers and business, market economies, Australia in the global economy.",
    country: "AU",
    examBoard: "NESA",
    color: "#f97316",
    sortOrder: 10,
    topics: [
      "Introduction to Economics",
      "Consumers and Business",
      "Market Economies",
      "Labour Markets",
      "Financial Markets",
      "Australia in the Global Economy",
      "Economic Issues",
    ],
  },
];

async function main() {
  console.log("🌱 Seeding subjects and topics...");

  for (const subject of subjects) {
    const { topics: topicNames, ...subjectData } = subject;

    const created = await prisma.subject.upsert({
      where: { code: subjectData.code },
      update: {
        name: subjectData.name,
        description: subjectData.description,
        color: subjectData.color,
        sortOrder: subjectData.sortOrder,
      },
      create: subjectData,
    });

    console.log(`  ✓ Subject: ${created.name}`);

    for (let i = 0; i < topicNames.length; i++) {
      await prisma.topic.upsert({
        where: {
          subjectId_name: { subjectId: created.id, name: topicNames[i] },
        },
        update: {},
        create: {
          subjectId: created.id,
          name: topicNames[i],
          sortOrder: i,
        },
      });
    }

    console.log(`    ✓ ${topicNames.length} topics seeded`);
  }

  // ── Exam Programs & Specifications ──────────────────────────────────────────
  console.log("\n🌱 Seeding exam programs...");

  const examPrograms = [
    {
      code: "AP",
      name: "Advanced Placement",
      country: "US",
      authority: "College Board",
      description: "College Board AP exams — university-level courses taken in high school.",
      specs: [
        {
          code: "AP_MACRO",
          name: "AP Macroeconomics",
          gradeLevel: "Grade 11-12",
          examBoard: "College Board",
          defaultDurationMinutes: 130,
          scoringModel: "composite_1_5",
          reportingCategories: [
            "Basic Economic Concepts",
            "Economic Performance",
            "National Income",
            "Financial Sector",
            "Stabilization Policies",
            "Open Economy",
          ],
        },
        {
          code: "AP_MICRO",
          name: "AP Microeconomics",
          gradeLevel: "Grade 11-12",
          examBoard: "College Board",
          defaultDurationMinutes: 130,
          scoringModel: "composite_1_5",
          reportingCategories: [
            "Basic Economic Concepts",
            "Supply and Demand",
            "Production and Cost",
            "Imperfect Competition",
            "Factor Markets",
            "Market Failure",
          ],
        },
      ],
    },
    {
      code: "NSW_OC",
      name: "NSW Opportunity Class",
      country: "AU",
      authority: "NSW Department of Education",
      description: "NSW Opportunity Class Placement Test — selects students for academically selective classes in Years 5-6.",
      specs: [
        {
          code: "NSW_OC_READING",
          name: "OC Thinking Skills",
          gradeLevel: "Year 4",
          examBoard: "NSW DoE",
          defaultDurationMinutes: 40,
          scoringModel: "raw_score",
          reportingCategories: ["Verbal Reasoning", "Numerical Reasoning"],
        },
        {
          code: "NSW_OC_MATHS",
          name: "OC Mathematical Reasoning",
          gradeLevel: "Year 4",
          examBoard: "NSW DoE",
          defaultDurationMinutes: 40,
          scoringModel: "raw_score",
          reportingCategories: ["Arithmetic", "Problem Solving"],
        },
      ],
    },
    {
      code: "NSW_SELECTIVE",
      name: "NSW Selective High School",
      country: "AU",
      authority: "NSW Department of Education",
      description: "NSW Selective High School Placement Test — selects Year 7 students for selective high schools.",
      specs: [
        {
          code: "NSW_SEL_READING",
          name: "Selective Reading",
          gradeLevel: "Year 6",
          examBoard: "NSW DoE",
          defaultDurationMinutes: 40,
          scoringModel: "raw_score",
          reportingCategories: ["Reading Comprehension", "Vocabulary"],
        },
        {
          code: "NSW_SEL_MATHS",
          name: "Selective Mathematical Reasoning",
          gradeLevel: "Year 6",
          examBoard: "NSW DoE",
          defaultDurationMinutes: 40,
          scoringModel: "raw_score",
          reportingCategories: ["Arithmetic", "Problem Solving", "Geometry"],
        },
        {
          code: "NSW_SEL_THINKING",
          name: "Selective Thinking Skills",
          gradeLevel: "Year 6",
          examBoard: "NSW DoE",
          defaultDurationMinutes: 30,
          scoringModel: "raw_score",
          reportingCategories: ["Verbal Reasoning", "Numerical Reasoning", "Abstract Reasoning"],
        },
        {
          code: "NSW_SEL_WRITING",
          name: "Selective Writing",
          gradeLevel: "Year 6",
          examBoard: "NSW DoE",
          defaultDurationMinutes: 20,
          scoringModel: "raw_score",
          reportingCategories: ["Narrative Writing", "Persuasive Writing"],
        },
      ],
    },
    {
      code: "NSW_SCHOOL",
      name: "NSW School Exams",
      country: "AU",
      authority: "NESA",
      description: "NSW NESA school-based exams including HSC and Trials.",
      specs: [
        {
          code: "NSW_HSC_MATHS_ADV",
          name: "HSC Mathematics Advanced",
          gradeLevel: "Year 12",
          examBoard: "NESA",
          defaultDurationMinutes: 180,
          scoringModel: "raw_100",
          reportingCategories: ["Functions", "Trigonometry", "Calculus", "Statistics"],
        },
        {
          code: "NSW_HSC_ECON",
          name: "HSC Economics",
          gradeLevel: "Year 12",
          examBoard: "NESA",
          defaultDurationMinutes: 180,
          scoringModel: "raw_100",
          reportingCategories: ["Introduction to Economics", "The Global Economy", "Australia in the Global Economy", "Economic Policies"],
        },
      ],
    },
    {
      code: "SAT",
      name: "SAT",
      country: "US",
      authority: "College Board",
      description: "College Board SAT — digital adaptive college admissions test.",
      specs: [
        {
          code: "SAT_MATH",
          name: "SAT Math",
          gradeLevel: "Grade 11-12",
          examBoard: "College Board",
          defaultDurationMinutes: 70,
          scoringModel: "scaled_200_800",
          reportingCategories: ["Algebra", "Advanced Math", "Problem Solving and Data Analysis", "Geometry and Trigonometry"],
        },
        {
          code: "SAT_RW",
          name: "SAT Reading and Writing",
          gradeLevel: "Grade 11-12",
          examBoard: "College Board",
          defaultDurationMinutes: 64,
          scoringModel: "scaled_200_800",
          reportingCategories: ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"],
        },
      ],
    },
  ];

  for (const prog of examPrograms) {
    const { specs, ...programData } = prog;

    const program = await prisma.examProgram.upsert({
      where: { code: programData.code },
      update: { name: programData.name, description: programData.description },
      create: programData,
    });

    console.log(`  ✓ ExamProgram: ${program.name}`);

    for (const spec of specs) {
      await prisma.examSpecification.upsert({
        where: { examProgramId_code: { examProgramId: program.id, code: spec.code } },
        update: { name: spec.name },
        create: { examProgramId: program.id, ...spec },
      });
    }

    console.log(`    ✓ ${specs.length} specifications seeded`);
  }

  // ── Exam Templates (AP Macro + Micro real-exam format) ──────────────────────
  console.log("\n🌱 Seeding exam templates...");

  const apMacroSpec = await prisma.examSpecification.findFirst({ where: { code: "AP_MACRO" } });
  const apMicroSpec = await prisma.examSpecification.findFirst({ where: { code: "AP_MICRO" } });

  if (apMacroSpec) {
    const macroTemplate = await prisma.examTemplate.upsert({
      where: { id: "et_ap_macro_2025" },
      update: {},
      create: {
        id: "et_ap_macro_2025",
        examSpecificationId: apMacroSpec.id,
        name: "AP Macroeconomics — 2025 Format",
        version: "2025",
        year: 2025,
        totalDurationMinutes: 130,
        totalMarks: 80,
        navigationRules: { canGoBack: true, mustCompleteSection: false },
        toolRules: { calculator: false, formulaSheet: false },
        instructions:
          "This exam has two sections. Section I contains 60 multiple-choice questions (60 minutes). Section II contains 3 free-response questions (70 minutes). You may not use a calculator.",
        status: "APPROVED",
      },
    });

    await prisma.paperSection.upsert({
      where: { id: "ps_ap_macro_2025_mcq" },
      update: {},
      create: {
        id: "ps_ap_macro_2025_mcq",
        examTemplateId: macroTemplate.id,
        title: "Section I — Multiple Choice",
        instructions: "Choose the best answer for each question. Each question is worth 1 point. No penalty for guessing.",
        sortOrder: 0,
        durationMinutes: 60,
        questionCount: 60,
        marks: 60,
        allowedQuestionTypes: ["MCQ"],
      },
    });

    await prisma.paperSection.upsert({
      where: { id: "ps_ap_macro_2025_frq" },
      update: {},
      create: {
        id: "ps_ap_macro_2025_frq",
        examTemplateId: macroTemplate.id,
        title: "Section II — Free Response",
        instructions:
          "Answer all three free-response questions. Clearly label all graphs and diagrams. Show all work for calculations. Answers without supporting work may not earn full credit.",
        sortOrder: 1,
        durationMinutes: 70,
        questionCount: 3,
        marks: 20,
        allowedQuestionTypes: ["FRQ_STRUCTURED"],
      },
    });

    console.log("  ✓ AP Macro ExamTemplate + sections");
  }

  if (apMicroSpec) {
    const microTemplate = await prisma.examTemplate.upsert({
      where: { id: "et_ap_micro_2025" },
      update: {},
      create: {
        id: "et_ap_micro_2025",
        examSpecificationId: apMicroSpec.id,
        name: "AP Microeconomics — 2025 Format",
        version: "2025",
        year: 2025,
        totalDurationMinutes: 130,
        totalMarks: 80,
        navigationRules: { canGoBack: true, mustCompleteSection: false },
        toolRules: { calculator: false, formulaSheet: false },
        instructions:
          "This exam has two sections. Section I contains 60 multiple-choice questions (60 minutes). Section II contains 3 free-response questions (70 minutes). You may not use a calculator.",
        status: "APPROVED",
      },
    });

    await prisma.paperSection.upsert({
      where: { id: "ps_ap_micro_2025_mcq" },
      update: {},
      create: {
        id: "ps_ap_micro_2025_mcq",
        examTemplateId: microTemplate.id,
        title: "Section I — Multiple Choice",
        instructions: "Choose the best answer for each question. Each question is worth 1 point. No penalty for guessing.",
        sortOrder: 0,
        durationMinutes: 60,
        questionCount: 60,
        marks: 60,
        allowedQuestionTypes: ["MCQ"],
      },
    });

    await prisma.paperSection.upsert({
      where: { id: "ps_ap_micro_2025_frq" },
      update: {},
      create: {
        id: "ps_ap_micro_2025_frq",
        examTemplateId: microTemplate.id,
        title: "Section II — Free Response",
        instructions:
          "Answer all three free-response questions. Clearly label all graphs and diagrams. Show all work for calculations.",
        sortOrder: 1,
        durationMinutes: 70,
        questionCount: 3,
        marks: 20,
        allowedQuestionTypes: ["FRQ_STRUCTURED"],
      },
    });

    console.log("  ✓ AP Micro ExamTemplate + sections");
  }

  // ── FRQ Questions (2025 AP-style practice questions) ────────────────────────
  console.log("\n🌱 Seeding FRQ questions...");

  const macroSubject = await prisma.subject.findUnique({ where: { code: "AP_MACRO" } });
  const microSubject = await prisma.subject.findUnique({ where: { code: "AP_MICRO" } });

  if (macroSubject) {
    const macroTopics = await prisma.topic.findMany({ where: { subjectId: macroSubject.id } });
    const topicByName = (name: string) => macroTopics.find((t) => t.name.toLowerCase().includes(name.toLowerCase()));

    const nidTopic = topicByName("national income") ?? macroTopics[0];
    const finTopic = topicByName("financial") ?? macroTopics[1];
    const openTopic = topicByName("open") ?? macroTopics[2];

    // AP Macro FRQ Q1 — Long (10 pts)
    const macroFrq1 = await prisma.question.upsert({
      where: { id: "frq_ap_macro_2025_q1" },
      update: {},
      create: {
        id: "frq_ap_macro_2025_q1",
        topicId: nidTopic.id,
        type: "FRQ_STRUCTURED",
        difficulty: "HARD",
        status: "PUBLISHED",
        bloomLevel: 4,
        examProgramCode: "AP_MACRO",
        estimatedSeconds: 900,
        stem: `The United States economy is currently operating at its long-run equilibrium. Congress passes legislation increasing government expenditure by $400 billion with no change in taxes. Assume a closed economy.

Answer all five parts (a)–(e) below. Support your answers with correctly labeled graphs where instructed.`,
        explanation: "This question tests understanding of fiscal policy, crowding out, and long-run adjustment using AD-AS and loanable funds models.",
      },
    });

    const macroFrq1Parts = [
      {
        id: "frq_ap_macro_2025_q1a",
        label: "(a)",
        prompt: "Draw a correctly labeled graph of the short-run and long-run aggregate supply and aggregate demand model showing the initial long-run equilibrium. Label the equilibrium price level PL₁ and output Y₁.",
        marks: 1,
        sortOrder: 0,
        expectedResponseType: "TEXT" as const,
        requiresGraph: true,
        rubric: [{ text: "Graph has correctly labeled axes (Price Level on vertical, Real GDP on horizontal), downward-sloping AD, upward-sloping SRAS, and vertical LRAS intersecting at the same point. PL₁ and Y₁ correctly labeled at equilibrium.", marks: 1 }],
      },
      {
        id: "frq_ap_macro_2025_q1b",
        label: "(b)",
        prompt: "On your graph from part (a), show the effect of the increase in government spending on aggregate demand. Label the new short-run equilibrium price level PL₂ and output Y₂.",
        marks: 2,
        sortOrder: 1,
        expectedResponseType: "TEXT" as const,
        requiresGraph: true,
        rubric: [
          { text: "AD curve shifts right (AD → AD₂).", marks: 1 },
          { text: "New short-run equilibrium labeled with higher price level PL₂ and higher output Y₂ (to the right of LRAS).", marks: 1 },
        ],
      },
      {
        id: "frq_ap_macro_2025_q1c",
        label: "(c)",
        prompt: "Explain why the actual increase in real GDP is less than the simple multiplier would predict. Your answer must reference the crowding out effect.",
        marks: 2,
        sortOrder: 2,
        expectedResponseType: "TEXT" as const,
        requiresGraph: false,
        rubric: [
          { text: "Identifies that increased government borrowing raises the interest rate (or reduces private investment).", marks: 1 },
          { text: "Explains that reduced private investment (crowding out) offsets some of the government spending effect, resulting in a smaller increase in AD and real GDP than the simple multiplier predicts.", marks: 1 },
        ],
      },
      {
        id: "frq_ap_macro_2025_q1d",
        label: "(d)",
        prompt: "Draw a correctly labeled graph of the loanable funds market. On your graph, show the effect of the increase in government spending on the real interest rate.",
        marks: 2,
        sortOrder: 3,
        expectedResponseType: "TEXT" as const,
        requiresGraph: true,
        rubric: [
          { text: "Graph has correctly labeled axes (Real Interest Rate vertical, Quantity of Loanable Funds horizontal) with downward-sloping Demand and upward-sloping Supply.", marks: 1 },
          { text: "Demand for loanable funds shifts right, showing increase in real interest rate.", marks: 1 },
        ],
      },
      {
        id: "frq_ap_macro_2025_q1e",
        label: "(e)",
        prompt: "Assume the economy self-adjusts from the short-run equilibrium shown in part (b) to a new long-run equilibrium. Using your AD-AS graph, show and explain what happens to the price level and to real GDP in the long run.",
        marks: 3,
        sortOrder: 4,
        expectedResponseType: "TEXT" as const,
        requiresGraph: true,
        rubric: [
          { text: "SRAS shifts left on the graph (SRAS → SRAS₂).", marks: 1 },
          { text: "New long-run equilibrium is at LRAS with a higher price level (PL₃ > PL₂) correctly labeled.", marks: 1 },
          { text: "Explains that wages and input prices rise as the economy is above full employment, shifting SRAS left until real GDP returns to Y₁ (LRAS) at a higher price level.", marks: 1 },
        ],
      },
    ];

    for (const part of macroFrq1Parts) {
      const { rubric, ...partData } = part;
      const qp = await prisma.questionPart.upsert({
        where: { id: partData.id },
        update: {},
        create: { questionId: macroFrq1.id, ...partData },
      });
      for (let i = 0; i < rubric.length; i++) {
        await prisma.rubricCriterion.upsert({
          where: { id: `${qp.id}_r${i}` },
          update: {},
          create: { id: `${qp.id}_r${i}`, questionId: macroFrq1.id, questionPartId: qp.id, marks: rubric[i].marks, criterionText: rubric[i].text, sortOrder: i },
        });
      }
    }

    // AP Macro FRQ Q2 — Monetary Policy (5 pts)
    const macroFrq2 = await prisma.question.upsert({
      where: { id: "frq_ap_macro_2025_q2" },
      update: {},
      create: {
        id: "frq_ap_macro_2025_q2",
        topicId: finTopic.id,
        type: "FRQ_STRUCTURED",
        difficulty: "MEDIUM",
        status: "PUBLISHED",
        bloomLevel: 3,
        examProgramCode: "AP_MACRO",
        estimatedSeconds: 600,
        stem: `The Federal Reserve observes that the economy is overheating and that inflation is rising significantly above its 2% target.

Answer all three parts (a)–(c).`,
      },
    });

    const macroFrq2Parts = [
      { id: "frq_ap_macro_2025_q2a", label: "(a)", prompt: "Identify the open market operation the Federal Reserve should conduct to address rising inflation. Explain how this operation affects the money supply.", marks: 2, sortOrder: 0, requiresGraph: false, rubric: [{ text: "Correctly identifies selling bonds (open market sale).", marks: 1 }, { text: "Explains that selling bonds removes reserves from the banking system, decreasing the money supply.", marks: 1 }] },
      { id: "frq_ap_macro_2025_q2b", label: "(b)", prompt: "Explain the effect of the Federal Reserve's action on the federal funds rate and on aggregate demand.", marks: 1, sortOrder: 1, requiresGraph: false, rubric: [{ text: "States that selling bonds increases the federal funds rate, which raises borrowing costs, reducing investment and consumption, thereby decreasing aggregate demand.", marks: 1 }] },
      { id: "frq_ap_macro_2025_q2c", label: "(c)", prompt: "Draw a correctly labeled graph of the money market and show the effect of the Federal Reserve's action on the nominal interest rate.", marks: 2, sortOrder: 2, requiresGraph: true, rubric: [{ text: "Graph correctly labeled with Nominal Interest Rate on vertical axis, Quantity of Money on horizontal axis, downward-sloping Md and vertical Ms.", marks: 1 }, { text: "Ms shifts left, showing higher nominal interest rate at new equilibrium.", marks: 1 }] },
    ];

    for (const part of macroFrq2Parts) {
      const { rubric, ...partData } = part;
      const qp = await prisma.questionPart.upsert({
        where: { id: partData.id },
        update: {},
        create: { questionId: macroFrq2.id, expectedResponseType: "TEXT", requiresGraph: partData.requiresGraph, ...partData },
      });
      for (let i = 0; i < rubric.length; i++) {
        await prisma.rubricCriterion.upsert({
          where: { id: `${qp.id}_r${i}` },
          update: {},
          create: { id: `${qp.id}_r${i}`, questionId: macroFrq2.id, questionPartId: qp.id, marks: rubric[i].marks, criterionText: rubric[i].text, sortOrder: i },
        });
      }
    }

    // AP Macro FRQ Q3 — Comparative Advantage (5 pts)
    const macroFrq3 = await prisma.question.upsert({
      where: { id: "frq_ap_macro_2025_q3" },
      update: {},
      create: {
        id: "frq_ap_macro_2025_q3",
        topicId: openTopic.id,
        type: "FRQ_STRUCTURED",
        difficulty: "MEDIUM",
        status: "PUBLISHED",
        bloomLevel: 3,
        examProgramCode: "AP_MACRO",
        estimatedSeconds: 600,
        stem: `Country Alpha and Country Beta each produce two goods: wheat and cloth. The table below shows the maximum output per worker-hour for each country.

| Country | Wheat (units) | Cloth (units) |
|---------|---------------|---------------|
| Alpha   | 12            | 4             |
| Beta    | 6             | 3             |

Answer all four parts (a)–(d).`,
      },
    });

    const macroFrq3Parts = [
      { id: "frq_ap_macro_2025_q3a", label: "(a)", prompt: "Calculate the opportunity cost of producing one unit of cloth for Country Alpha and for Country Beta. Show your work.", marks: 2, sortOrder: 0, requiresGraph: false, rubric: [{ text: "Country Alpha: opportunity cost of 1 cloth = 3 wheat (12/4). Accept equivalent work shown.", marks: 1 }, { text: "Country Beta: opportunity cost of 1 cloth = 2 wheat (6/3). Accept equivalent work shown.", marks: 1 }] },
      { id: "frq_ap_macro_2025_q3b", label: "(b)", prompt: "Based on your calculations in part (a), identify which country has a comparative advantage in the production of cloth. Explain your reasoning.", marks: 1, sortOrder: 1, requiresGraph: false, rubric: [{ text: "Country Beta has comparative advantage in cloth because its opportunity cost of producing cloth (2 wheat) is lower than Country Alpha's (3 wheat).", marks: 1 }] },
      { id: "frq_ap_macro_2025_q3c", label: "(c)", prompt: "Identify the range of terms of trade (in wheat per unit of cloth) that would make trade mutually beneficial for both countries.", marks: 1, sortOrder: 2, requiresGraph: false, rubric: [{ text: "Terms of trade must be between 2 wheat and 3 wheat per unit of cloth (2 < ToT < 3). Both bounds must be correct.", marks: 1 }] },
      { id: "frq_ap_macro_2025_q3d", label: "(d)", prompt: "Explain one reason why specialization based on comparative advantage leads to greater total output than if each country tries to produce both goods independently.", marks: 1, sortOrder: 3, requiresGraph: false, rubric: [{ text: "Accepts any valid explanation: each country allocates resources to where they are relatively most productive; resources are used more efficiently; total production possibilities expand beyond what either country could achieve alone.", marks: 1 }] },
    ];

    for (const part of macroFrq3Parts) {
      const { rubric, ...partData } = part;
      const qp = await prisma.questionPart.upsert({
        where: { id: partData.id },
        update: {},
        create: { questionId: macroFrq3.id, expectedResponseType: "TEXT", requiresGraph: false, ...partData },
      });
      for (let i = 0; i < rubric.length; i++) {
        await prisma.rubricCriterion.upsert({
          where: { id: `${qp.id}_r${i}` },
          update: {},
          create: { id: `${qp.id}_r${i}`, questionId: macroFrq3.id, questionPartId: qp.id, marks: rubric[i].marks, criterionText: rubric[i].text, sortOrder: i },
        });
      }
    }

    console.log("  ✓ AP Macro FRQ Q1, Q2, Q3 seeded");
  }

  if (microSubject) {
    const microTopics = await prisma.topic.findMany({ where: { subjectId: microSubject.id } });
    const topicByName = (name: string) => microTopics.find((t) => t.name.toLowerCase().includes(name.toLowerCase()));

    const sdTopic = topicByName("supply") ?? microTopics[0];
    const impTopic = topicByName("imperfect") ?? microTopics[1];
    const facTopic = topicByName("factor") ?? microTopics[2];

    // AP Micro FRQ Q1 — Externalities + Perfect Competition (10 pts)
    const microFrq1 = await prisma.question.upsert({
      where: { id: "frq_ap_micro_2025_q1" },
      update: {},
      create: {
        id: "frq_ap_micro_2025_q1",
        topicId: sdTopic.id,
        type: "FRQ_STRUCTURED",
        difficulty: "HARD",
        status: "PUBLISHED",
        bloomLevel: 4,
        examProgramCode: "AP_MICRO",
        estimatedSeconds: 900,
        stem: `A chemical plant produces industrial solvents. The production process releases pollutants into a nearby river, imposing costs on downstream residents and businesses. The government has determined that this negative production externality exists.

Answer all five parts (a)–(e).`,
      },
    });

    const microFrq1Parts = [
      { id: "frq_ap_micro_2025_q1a", label: "(a)", prompt: "Draw a correctly labeled graph of the market for industrial solvents. On your graph, show: (i) the market equilibrium quantity (Qm) and price (Pm), (ii) the socially optimal quantity (Qs), and (iii) the marginal external cost (MEC) at the market equilibrium quantity.", marks: 3, sortOrder: 0, requiresGraph: true, rubric: [{ text: "Graph has correctly labeled axes (Price/Cost on vertical, Quantity on horizontal) with downward-sloping D (= MSB = MPB) and upward-sloping S (= MPC).", marks: 1 }, { text: "MSC curve drawn above S (MPC) with the vertical gap representing MEC. Qs < Qm labeled correctly.", marks: 1 }, { text: "MEC correctly shown as the vertical distance between MSC and MPC at Qm.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q1b", label: "(b)", prompt: "Explain why the free market overproduces industrial solvents relative to the socially optimal quantity.", marks: 1, sortOrder: 1, requiresGraph: false, rubric: [{ text: "Producers do not bear the full cost of production; the external cost (pollution) is not reflected in the market price. At Qm, MSC > MSB, meaning the last unit produced reduces total social welfare.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q1c", label: "(c)", prompt: "Identify one government policy that could move the market toward the socially optimal quantity. Explain how this policy corrects the market failure.", marks: 2, sortOrder: 2, requiresGraph: false, rubric: [{ text: "Correctly identifies a policy: Pigouvian tax (per-unit tax equal to MEC), cap-and-trade system, regulation setting quantity at Qs, or assigning property rights (Coase theorem).", marks: 1 }, { text: "Correctly explains mechanism: e.g., a Pigouvian tax raises the producer's effective marginal cost, shifting S left until Qs is produced at the social optimum.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q1d", label: "(d)", prompt: "Draw a correctly labeled graph of a single firm in a perfectly competitive market earning short-run economic profit. On your graph, show the profit-maximizing quantity (Q*), price (P*), average total cost (ATC*), and shade the area representing economic profit.", marks: 3, sortOrder: 3, requiresGraph: true, rubric: [{ text: "Graph has correctly labeled axes and shows downward-sloping D, horizontal MR = P = AR at the market price, U-shaped ATC, and upward-sloping MC.", marks: 1 }, { text: "Profit-maximizing quantity Q* shown where MC = MR, with P* above ATC* at Q*.", marks: 1 }, { text: "Area of economic profit correctly shaded as the rectangle between P* and ATC* from 0 to Q*.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q1e", label: "(e)", prompt: "Explain what will happen to the number of firms in this perfectly competitive industry in the long run and identify the price the firm will charge in the long run.", marks: 1, sortOrder: 4, requiresGraph: false, rubric: [{ text: "Economic profits attract new firms into the industry; supply increases and price falls until economic profit is zero and price equals minimum ATC (P = min ATC).", marks: 1 }] },
    ];

    for (const part of microFrq1Parts) {
      const { rubric, ...partData } = part;
      const qp = await prisma.questionPart.upsert({
        where: { id: partData.id },
        update: {},
        create: { questionId: microFrq1.id, expectedResponseType: "TEXT", requiresGraph: partData.requiresGraph, ...partData },
      });
      for (let i = 0; i < rubric.length; i++) {
        await prisma.rubricCriterion.upsert({
          where: { id: `${qp.id}_r${i}` },
          update: {},
          create: { id: `${qp.id}_r${i}`, questionId: microFrq1.id, questionPartId: qp.id, marks: rubric[i].marks, criterionText: rubric[i].text, sortOrder: i },
        });
      }
    }

    // AP Micro FRQ Q2 — Monopoly (5 pts)
    const microFrq2 = await prisma.question.upsert({
      where: { id: "frq_ap_micro_2025_q2" },
      update: {},
      create: {
        id: "frq_ap_micro_2025_q2",
        topicId: impTopic.id,
        type: "FRQ_STRUCTURED",
        difficulty: "MEDIUM",
        status: "PUBLISHED",
        bloomLevel: 3,
        examProgramCode: "AP_MICRO",
        estimatedSeconds: 600,
        stem: `A firm is the only producer of a patented pharmaceutical drug and faces a downward-sloping demand curve. The firm maximizes profit.

Answer all three parts (a)–(c).`,
      },
    });

    const microFrq2Parts = [
      { id: "frq_ap_micro_2025_q2a", label: "(a)", prompt: "Draw a correctly labeled graph for this monopolist. On your graph, show: the demand curve (D), marginal revenue (MR), marginal cost (MC), average total cost (ATC), the profit-maximizing price (Pm), and the profit-maximizing quantity (Qm).", marks: 3, sortOrder: 0, requiresGraph: true, rubric: [{ text: "Graph has downward-sloping D and MR (MR steeper than D and below D) with MR intersecting horizontal or upward-sloping MC.", marks: 1 }, { text: "Qm correctly identified where MC = MR, and Pm found on the demand curve above Qm.", marks: 1 }, { text: "U-shaped ATC shown; if ATC < Pm at Qm, economic profit area may be shaded.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q2b", label: "(b)", prompt: "On your graph from part (a), identify and shade the area that represents the deadweight loss caused by the monopolist.", marks: 1, sortOrder: 1, requiresGraph: true, rubric: [{ text: "Deadweight loss correctly shaded as the triangle between the competitive quantity (where P = MC) and Qm, bounded by the demand curve above and MC below.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q2c", label: "(c)", prompt: "Explain why a monopolist produces a lower quantity of output than a perfectly competitive industry facing the same market demand and cost conditions.", marks: 1, sortOrder: 2, requiresGraph: false, rubric: [{ text: "A monopolist faces a downward-sloping demand curve so MR < P; it restricts output to the point where MR = MC, which is less than the competitive quantity (where P = MC), resulting in a higher price and lower output.", marks: 1 }] },
    ];

    for (const part of microFrq2Parts) {
      const { rubric, ...partData } = part;
      const qp = await prisma.questionPart.upsert({
        where: { id: partData.id },
        update: {},
        create: { questionId: microFrq2.id, expectedResponseType: "TEXT", requiresGraph: partData.requiresGraph, ...partData },
      });
      for (let i = 0; i < rubric.length; i++) {
        await prisma.rubricCriterion.upsert({
          where: { id: `${qp.id}_r${i}` },
          update: {},
          create: { id: `${qp.id}_r${i}`, questionId: microFrq2.id, questionPartId: qp.id, marks: rubric[i].marks, criterionText: rubric[i].text, sortOrder: i },
        });
      }
    }

    // AP Micro FRQ Q3 — Factor Markets (5 pts)
    const microFrq3 = await prisma.question.upsert({
      where: { id: "frq_ap_micro_2025_q3" },
      update: {},
      create: {
        id: "frq_ap_micro_2025_q3",
        topicId: facTopic.id,
        type: "FRQ_STRUCTURED",
        difficulty: "MEDIUM",
        status: "PUBLISHED",
        bloomLevel: 3,
        examProgramCode: "AP_MICRO",
        estimatedSeconds: 600,
        stem: `A bakery hires workers in a perfectly competitive labor market. Each additional worker hired adds to the firm's output, but with diminishing returns.

Answer all three parts (a)–(c).`,
      },
    });

    const microFrq3Parts = [
      { id: "frq_ap_micro_2025_q3a", label: "(a)", prompt: "Explain how a profit-maximizing bakery determines how many workers to hire. Use the concepts of marginal revenue product (MRP) and marginal resource cost (MRC) in your explanation.", marks: 2, sortOrder: 0, requiresGraph: false, rubric: [{ text: "Correctly defines MRP as the additional revenue generated by one additional worker (MRP = MR × MP) and MRC as the cost of hiring one additional worker (= wage in a competitive market).", marks: 1 }, { text: "States that the firm hires workers up to the point where MRP = MRC (MRP = W), and does not hire if MRP < wage.", marks: 1 }] },
      { id: "frq_ap_micro_2025_q3b", label: "(b)", prompt: "The government imposes a minimum wage above the current equilibrium wage. Draw a correctly labeled graph of the labor market for bakery workers. On your graph, show the effect of the minimum wage on: (i) the number of workers employed, (ii) the number of workers seeking jobs at the new wage, and (iii) any surplus or shortage of labor.", marks: 3, sortOrder: 1, requiresGraph: true, rubric: [{ text: "Graph correctly labeled with Wage Rate on vertical axis, Quantity of Labor on horizontal axis, downward-sloping labor demand (Ld) and upward-sloping labor supply (Ls).", marks: 1 }, { text: "Minimum wage (Wmin) drawn as a horizontal line above equilibrium wage. Quantity demanded (Qd) is less than equilibrium; quantity supplied (Qs) is more than equilibrium.", marks: 1 }, { text: "Surplus of labor (unemployment) correctly shown as the horizontal distance between Qd and Qs at Wmin.", marks: 1 }] },
    ];

    for (const part of microFrq3Parts) {
      const { rubric, ...partData } = part;
      const qp = await prisma.questionPart.upsert({
        where: { id: partData.id },
        update: {},
        create: { questionId: microFrq3.id, expectedResponseType: "TEXT", requiresGraph: partData.requiresGraph, ...partData },
      });
      for (let i = 0; i < rubric.length; i++) {
        await prisma.rubricCriterion.upsert({
          where: { id: `${qp.id}_r${i}` },
          update: {},
          create: { id: `${qp.id}_r${i}`, questionId: microFrq3.id, questionPartId: qp.id, marks: rubric[i].marks, criterionText: rubric[i].text, sortOrder: i },
        });
      }
    }

    console.log("  ✓ AP Micro FRQ Q1, Q2, Q3 seeded");
  }

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
