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

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
