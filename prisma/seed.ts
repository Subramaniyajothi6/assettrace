/**
 * Demo data, ported from docs/prototype/assets/data.js.
 * Dates are relative to "now" so dashboards always look current.
 * Running this WIPES every table first. Use it on the demo database only.
 */
import {
  PrismaClient,
  type AssetCondition,
  type AssetStatus,
  type HandoverStatus,
  type HistoryEvent,
  type NotificationType,
  type Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DAY = 864e5;

const SEEDED_AT = Date.now();
/** Date `offsetDays` from today at hh:mm local time, never later than the moment of seeding. */
function d(offsetDays: number, h = 10, m = 0): Date {
  const t = new Date();
  t.setHours(h, m, 0, 0);
  const at = t.getTime() + offsetDays * DAY;
  // "Today at 10:45" is still in the future when seeding early in the morning. Squeeze any future
  // time into the hour before seeding, in the same order, so no history row is dated ahead of now.
  return new Date(at <= SEEDED_AT ? at : SEEDED_AT - 3600e3 + (at - SEEDED_AT) / 24);
}
/** A date that is meant to be in the future (warranty end, expected return or completion): not squeezed. */
function ahead(offsetDays: number, h = 10, m = 0): Date {
  const t = new Date();
  t.setHours(h, m, 0, 0);
  return new Date(t.getTime() + offsetDays * DAY);
}

// ───────────── master data ─────────────

const DEPARTMENTS = [
  { key: "d-eng", name: "Engineering", code: "ENG", managers: ["u-mgr"] },
  { key: "d-it", name: "IT", code: "IT", managers: ["u-mgr", "u-lak"] },
  { key: "d-des", name: "Design", code: "DES", managers: ["u-mgr"] },
  { key: "d-sal", name: "Sales", code: "SAL", managers: [] },
  { key: "d-ops", name: "Operations", code: "OPS", managers: [] },
];

const LOCATIONS = [
  { key: "l-chn", name: "Chennai HQ", code: "CHN", address: "Guindy, Chennai 600032" },
  { key: "l-cbe", name: "Coimbatore", code: "CBE", address: "Peelamedu, Coimbatore 641004" },
  { key: "l-blr", name: "Bengaluru", code: "BLR", address: "HSR Layout, Bengaluru 560102" },
];

const CATEGORIES: [string, string][] = [
  ["LAP", "Laptop"], ["DES", "Desktop"], ["MON", "Monitor"], ["MOB", "Mobile phone"], ["TAB", "Tablet"], ["KEY", "Keyboard"],
  ["MOU", "Mouse"], ["HEA", "Headset"], ["PRN", "Printer"], ["RTR", "Router"], ["SWT", "Switch"], ["PRJ", "Projector"], ["OTH", "Other"],
];

const VENDORS = [
  { key: "v1", name: "Dell Technologies India", contactName: "Rohit Mehta", phone: "+91 80 4100 1100" },
  { key: "v2", name: "Lenovo India", contactName: "Asha Menon", phone: "+91 80 4930 2200" },
  { key: "v3", name: "HP India", contactName: "Vikram Rao", phone: "+91 80 3030 4040" },
  { key: "v4", name: "Redington", contactName: "Sales desk", phone: "+91 44 4224 3353" },
  { key: "v5", name: "Croma Business", contactName: "B2B team", phone: "+91 22 6125 0000" },
];

// [key, code, name, designation, dept, location]
const EMPLOYEES: [string, string, string, string, string, string][] = [
  ["e1", "EMP-0001", "Arun Kumar", "Software Engineer", "d-eng", "l-chn"],
  ["e2", "EMP-0002", "Priya Sundaram", "Senior Engineer", "d-eng", "l-chn"],
  ["e3", "EMP-0003", "Sanjay Krishnan", "IT Support", "d-it", "l-chn"],
  ["e4", "EMP-0004", "Meena Pillai", "Design Lead", "d-des", "l-chn"],
  ["e5", "EMP-0005", "Divya Natarajan", "Software Engineer", "d-eng", "l-chn"],
  ["e6", "EMP-0006", "Vignesh R", "Sales Executive", "d-sal", "l-blr"],
  ["e7", "EMP-0007", "Lakshmi Iyer", "Systems Admin", "d-it", "l-cbe"],
  ["e8", "EMP-0008", "Harish M", "Sales Executive", "d-sal", "l-blr"],
  ["e9", "EMP-0009", "Kavya S", "Product Designer", "d-des", "l-chn"],
  ["e10", "EMP-0010", "Rahul V", "Engineer", "d-eng", "l-cbe"],
  ["e11", "EMP-0011", "Karthik Raman", "Asset Manager", "d-it", "l-chn"],
  ["e12", "EMP-0012", "Anitha Joseph", "Administrator", "d-ops", "l-chn"],
  ["e13", "EMP-0013", "Gokul P", "Operations", "d-ops", "l-cbe"],
  ["e14", "EMP-0014", "Nisha Rao", "Engineer", "d-eng", "l-blr"],
];

const DEMO_PASSWORDS: Record<string, string> = {
  "admin@assettrace.dev": "Admin@123",
  "manager@assettrace.dev": "Manager@123",
  "employee@assettrace.dev": "Employee@123",
};
const OTHER_PASSWORD = "Password@123";

const USERS = [
  { key: "u-admin", email: "admin@assettrace.dev", name: "Anitha Joseph", role: "ADMIN", emp: "e12", last: d(0, 8, 41) },
  { key: "u-mgr", email: "manager@assettrace.dev", name: "Karthik Raman", role: "MANAGER", emp: "e11", last: d(0, 9, 2) },
  { key: "u-lak", email: "lakshmi@adz4needz.in", name: "Lakshmi Iyer", role: "MANAGER", emp: "e7", last: d(-1, 17, 10) },
  { key: "u-emp", email: "employee@assettrace.dev", name: "Arun Kumar", role: "EMPLOYEE", emp: "e1", last: d(0, 10, 20) },
  { key: "u-priya", email: "priya@adz4needz.in", name: "Priya Sundaram", role: "EMPLOYEE", emp: "e2", last: d(0, 10, 11) },
  { key: "u-kavya", email: "kavya@adz4needz.in", name: "Kavya S", role: "EMPLOYEE", emp: "e9", last: d(0, 9, 30) },
  { key: "u-vig", email: "vignesh@adz4needz.in", name: "Vignesh R", role: "EMPLOYEE", emp: "e6", last: d(-3, 12, 0) },
] as const;

// [cat, name, brand, model, serial, status, holder, loc, dept, cond, purchasedDaysAgo, cost, warrantyEndsInDays, vendor, assignedDaysAgo?, handover?]
type AssetRow = [string, string, string, string, string, AssetStatus, string | null, string, string, AssetCondition, number, number, number, string, number?, HandoverStatus?];
const ASSETS: AssetRow[] = [
  ["LAP", "Dell Latitude 5440", "Dell", "Latitude 5440", "5CG3421KX9", "ASSIGNED", "e2", "l-chn", "d-eng", "GOOD", 210, 78500, 155, "v1", 52, "CONFIRMED"],
  ["LAP", "Lenovo ThinkPad T14", "Lenovo", "ThinkPad T14 Gen 4", "PF3K9ZQ2", "UNDER_MAINTENANCE", "e1", "l-chn", "d-eng", "FAIR", 720, 92000, -60, "v2", 718, "CONFIRMED"],
  ["LAP", "Lenovo ThinkPad E14", "Lenovo", "ThinkPad E14 Gen 5", "PF2WX81A", "ASSIGNED", "e3", "l-chn", "d-it", "GOOD", 362, 64000, 3, "v2", 347, "CONFIRMED"],
  ["LAP", "HP EliteBook 840 G10", "HP", "EliteBook 840 G10", "5CD3170LMN", "AVAILABLE", null, "l-chn", "d-it", "NEW", 20, 112000, 1075, "v3"],
  ["LAP", "Dell Latitude 3540", "Dell", "Latitude 3540", "8HJT2X3", "RETURNED", null, "l-chn", "d-eng", "FAIR", 400, 58000, 90, "v1"],
  ["LAP", "Apple MacBook Air M2", "Apple", "MacBook Air 13 M2", "C02HX1Q8MD6", "ASSIGNED", "e4", "l-chn", "d-des", "GOOD", 330, 114900, 35, "v5", 325, "CONFIRMED"],
  ["LAP", "Lenovo IdeaPad Slim 5", "Lenovo", "IdeaPad Slim 5", "PF4RT77C", "RESERVED", null, "l-chn", "d-eng", "NEW", 12, 68000, 700, "v2"],
  ["LAP", "Dell Vostro 3420", "Dell", "Vostro 3420", "7GHK1Y2", "DAMAGED", null, "l-chn", "d-eng", "POOR", 900, 46000, -250, "v1"],
  ["LAP", "HP ProBook 440 G8", "HP", "ProBook 440 G8", "5CD1093ABC", "RETIRED", null, "l-chn", "d-it", "POOR", 1500, 52000, -400, "v3"],
  ["LAP", "Asus ExpertBook B1", "Asus", "ExpertBook B1400", "N8NXCV12", "LOST", null, "l-cbe", "d-eng", "FAIR", 500, 49000, 60, "v4"],
  ["LAP", "Dell Latitude 7440", "Dell", "Latitude 7440", "3JKL882", "ASSIGNED", "e10", "l-cbe", "d-eng", "GOOD", 150, 128000, 580, "v1", 52, "CONFIRMED"],
  ["LAP", "Lenovo ThinkPad X1 Carbon", "Lenovo", "X1 Carbon Gen 11", "PF5ZZ019", "ASSIGNED", "e11", "l-chn", "d-it", "GOOD", 250, 165000, 480, "v2", 247, "CONFIRMED"],
  ["LAP", "HP EliteBook 640 G10", "HP", "EliteBook 640 G10", "5CD31ZZ771", "ASSIGNED", "e9", "l-chn", "d-des", "GOOD", 180, 89000, 540, "v3", 180, "CONFIRMED"],
  ["LAP", "Dell Latitude 5440", "Dell", "Latitude 5440", "5CG3421KY2", "AVAILABLE", null, "l-cbe", "d-eng", "GOOD", 210, 78500, 155, "v1"],
  ["LAP", "Lenovo ThinkPad E14", "Lenovo", "ThinkPad E14 Gen 5", "PF2WX99B", "ASSIGNED", "e14", "l-blr", "d-eng", "GOOD", 362, 64000, 18, "v2", 300, "CONFIRMED"],
  ["MON", "Dell P2422H", "Dell", "P2422H", "CN0R8WX474261", "ASSIGNED", "e1", "l-chn", "d-eng", "NEW", 1, 15500, 1094, "v1", 0, "PENDING"],
  ["MON", "LG 27UL500", "LG", "27UL500", "104NTPC3M210", "ASSIGNED", "e4", "l-chn", "d-des", "GOOD", 420, 23900, 310, "v5", 400, "CONFIRMED"],
  ["MON", "Dell P2422H", "Dell", "P2422H", "CN0R8WX474299", "ASSIGNED", "e9", "l-chn", "d-des", "GOOD", 700, 15500, 27, "v1", 500, "CONFIRMED"],
  ["MON", "Samsung S3 24\"", "Samsung", "LS24C310", "H4ZT900122", "AVAILABLE", null, "l-chn", "d-it", "GOOD", 300, 11200, 430, "v5"],
  ["MON", "BenQ GW2790", "BenQ", "GW2790", "ET7AH01992", "UNDER_MAINTENANCE", null, "l-chn", "d-des", "FAIR", 600, 14800, 130, "v4"],
  ["DES", "Dell OptiPlex 7010", "Dell", "OptiPlex 7010", "9QWE7710", "ASSIGNED", "e7", "l-cbe", "d-it", "GOOD", 351, 72000, 14, "v1", 350, "DISPUTED"],
  ["DES", "HP Pro Tower 400 G9", "HP", "Pro Tower 400 G9", "4CE2210PQR", "AVAILABLE", null, "l-chn", "d-it", "GOOD", 500, 61000, 230, "v3"],
  ["MOB", "Samsung Galaxy A54", "Samsung", "SM-A546E", "R5CW30ABCDE", "ASSIGNED", "e8", "l-blr", "d-sal", "GOOD", 344, 38999, 21, "v5", 340, "CONFIRMED"],
  ["MOB", "Apple iPhone 14", "Apple", "iPhone 14", "F2LZK9P1N72Q", "ASSIGNED", "e6", "l-blr", "d-sal", "GOOD", 400, 69900, 330, "v5", 390, "CONFIRMED"],
  ["TAB", "Apple iPad 10th gen", "Apple", "iPad 10", "DMPXK1Q2Z9", "AVAILABLE", null, "l-blr", "d-sal", "NEW", 60, 39900, 305, "v5"],
  ["HEA", "Jabra Evolve2 50", "Jabra", "Evolve2 50", "J2501188", "ASSIGNED", "e1", "l-chn", "d-eng", "GOOD", 285, 17500, 450, "v4", 284, "CONFIRMED"],
  ["HEA", "Jabra Evolve2 30", "Jabra", "Evolve2 30", "J3009921", "ASSIGNED", "e6", "l-blr", "d-sal", "FAIR", 500, 9800, 230, "v4", 480, "CONFIRMED"],
  ["KEY", "Logitech MX Keys", "Logitech", "MX Keys", "2117LZ0A8", "ASSIGNED", "e2", "l-chn", "d-eng", "GOOD", 210, 10995, 155, "v4", 66, "CONFIRMED"],
  ["MOU", "Logitech MX Master 3S", "Logitech", "MX Master 3S", "2215LZ1B4", "AVAILABLE", null, "l-chn", "d-eng", "NEW", 40, 9995, 690, "v4"],
  ["PRN", "HP LaserJet Pro M404", "HP", "LaserJet Pro M404dn", "PHBVC12345", "AVAILABLE", null, "l-chn", "d-it", "GOOD", 700, 24500, 9, "v3"],
  ["RTR", "Cisco ISR 1100", "Cisco", "C1111-4P", "FGL2231XYZ", "AVAILABLE", null, "l-chn", "d-it", "GOOD", 800, 54000, 200, "v4"],
  ["PRJ", "Epson EB-X51", "Epson", "EB-X51", "X5LK220019", "AVAILABLE", null, "l-cbe", "d-ops", "GOOD", 450, 42000, 280, "v5"],
  ["LAP", "Dell Latitude 3420", "Dell", "Latitude 3420", "6GHT2X1", "RETIRED", null, "l-cbe", "d-ops", "POOR", 1600, 48000, -500, "v1"],
  ["MOB", "Redmi Note 12", "Xiaomi", "Redmi Note 12", "RN12XA77123", "ASSIGNED", "e13", "l-cbe", "d-ops", "GOOD", 200, 15999, 165, "v5", 199, "CONFIRMED"],
];

const ACCESSORIES: Record<string, string[]> = {
  LAP: ["Charger", "Laptop bag"], MON: ["HDMI cable", "Power cable"], MOB: ["Charger", "Case"],
  HEA: ["USB dongle"], DES: ["Keyboard", "Mouse"], TAB: ["Charger"],
};

async function main() {
  console.log("Wiping tables…");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );

  // key → database id
  const id: Record<string, string> = {};
  const nameOfEmp: Record<string, string> = {};
  const deptOfEmp: Record<string, string> = {};
  const locOfEmp: Record<string, string> = {};

  console.log("Users…");
  const hashCache: Record<string, string> = {};
  const hash = async (pw: string) => (hashCache[pw] ??= await bcrypt.hash(pw, 10));
  for (const u of USERS) {
    const row = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        lastLoginAt: u.last,
        passwordHash: await hash(DEMO_PASSWORDS[u.email] ?? OTHER_PASSWORD),
      },
    });
    id[u.key] = row.id;
  }
  const userByName: Record<string, string> = Object.fromEntries(USERS.map((u) => [u.name, id[u.key]]));
  const MGR = id["u-mgr"];
  const actor = (name: string) => userByName[name] ?? MGR;

  console.log("Master data…");
  for (const x of DEPARTMENTS) {
    const row = await prisma.department.create({
      data: { name: x.name, code: x.code, managers: { connect: x.managers.map((k) => ({ id: id[k] })) } },
    });
    id[x.key] = row.id;
  }
  for (const x of LOCATIONS) {
    id[x.key] = (await prisma.location.create({ data: { name: x.name, code: x.code, address: x.address } })).id;
  }
  for (const [code, name] of CATEGORIES) {
    id[`c-${code}`] = (await prisma.assetCategory.create({ data: { code, name } })).id;
  }
  for (const x of VENDORS) {
    id[x.key] = (await prisma.vendor.create({ data: { name: x.name, contactName: x.contactName, phone: x.phone } })).id;
  }

  console.log("Employees…");
  const userOfEmp: Record<string, string> = Object.fromEntries(USERS.map((u) => [u.emp, id[u.key]]));
  for (const [key, code, name, designation, dept, loc] of EMPLOYEES) {
    const row = await prisma.employee.create({
      data: {
        employeeCode: code,
        name,
        designation,
        email: `${name.split(" ")[0].toLowerCase()}@adz4needz.in`,
        departmentId: id[dept],
        locationId: id[loc],
        userId: userOfEmp[key] ?? null,
      },
    });
    id[key] = row.id;
    nameOfEmp[key] = name;
    deptOfEmp[key] = dept;
    locOfEmp[key] = loc;
  }

  // History is collected, then written in one go (sorted by time).
  const history: Prisma.AssetHistoryCreateManyInput[] = [];
  const hist = (
    assetKey: string,
    at: Date,
    event: HistoryEvent,
    description: string,
    by: string,
    fromStatus?: AssetStatus,
    toStatus?: AssetStatus,
  ) => history.push({ assetId: id[assetKey], createdAt: at, event, description, actorId: actor(by), fromStatus, toStatus });

  console.log("Assets & assignments…");
  const counters: Record<string, number> = {};
  const assetCat: Record<string, string> = {};
  for (const [i, r] of ASSETS.entries()) {
    const [cat, name, brand, model, serial, status, holder, loc, dept, cond, boughtAgo, cost, warrantyIn, vendor, assignedAgo, handover] = r;
    counters[cat] = (counters[cat] ?? 0) + 1;
    const key = `a${i + 1}`;
    assetCat[key] = cat;
    const asset = await prisma.asset.create({
      data: {
        assetTag: `AST-${cat}-${String(counters[cat]).padStart(4, "0")}`,
        name,
        assetType: CATEGORIES.find((c) => c[0] === cat)![1],
        brand,
        model,
        serialNumber: serial,
        purchaseDate: d(-boughtAgo),
        purchaseCost: cost,
        warrantyStart: d(-boughtAgo),
        warrantyEnd: ahead(warrantyIn),
        status,
        condition: cond,
        notes: cat === "LAP" ? "16 GB RAM · 512 GB SSD" : null,
        categoryId: id[`c-${cat}`],
        vendorId: id[vendor],
        locationId: id[loc],
        departmentId: id[dept],
        currentHolderId: holder ? id[holder] : null,
        createdById: MGR,
        createdAt: d(-boughtAgo + 2, 15, 15),
      },
    });
    id[key] = asset.id;
    // Registered 2 days after purchase, but never after its first assignment or in the future
    // (an asset bought yesterday and assigned today would otherwise be "registered" tomorrow).
    const registeredAt = Math.min(
      d(-boughtAgo + 2, 15, 15).getTime(),
      holder && assignedAgo !== undefined ? d(-assignedAgo, 10, 45).getTime() - 2 * 3600e3 : Infinity,
      Date.now() - 3600e3,
    );
    hist(key, new Date(registeredAt), "REGISTERED", `Registered as Available · ₹${cost.toLocaleString("en-IN")}`, "Karthik Raman", undefined, "AVAILABLE");

    if (holder && assignedAgo !== undefined && handover) {
      const at = d(-assignedAgo, 10, 45);
      const confirmedAt = handover === "CONFIRMED" ? d(-assignedAgo + 1, 9, 40) : null;
      const accessories = ACCESSORIES[cat] ?? [];
      const g = await prisma.assignment.create({
        data: {
          assetId: asset.id,
          employeeId: id[holder],
          departmentId: id[deptOfEmp[holder]],
          locationId: id[loc],
          assignedById: MGR,
          assignedAt: at,
          expectedReturnDate: ahead(-assignedAgo + 365),
          conditionAtAssignment: cond,
          accessories,
          handoverStatus: handover,
          handoverDate: at,
          handoverConfirmedAt: confirmedAt,
          handoverNote: handover === "DISPUTED" ? "Mouse was missing from the kit" : null,
        },
      });
      id[`g${key}`] = g.id;
      hist(key, at, "ASSIGNED", `Assigned to ${nameOfEmp[holder]}`, "Karthik Raman", "AVAILABLE", "ASSIGNED");
      if (confirmedAt) {
        hist(key, confirmedAt, "HANDOVER_CONFIRMED", `Handover signed · ${accessories.length ? `accessories: ${accessories.join(", ")}` : "no accessories"}`, nameOfEmp[holder]);
      }
      if (handover === "DISPUTED") {
        hist(key, d(-349, 11), "HANDOVER_DISPUTED", "Disputed: mouse missing from the kit", nameOfEmp[holder]);
      }
    }
  }

  // Overdue expected returns for two assets
  await prisma.assignment.update({ where: { id: id["ga3"] }, data: { expectedReturnDate: d(-8) } });
  await prisma.assignment.update({ where: { id: id["ga6"] }, data: { expectedReturnDate: d(-3) } });

  // Past (closed) assignments
  const past = async (key: string, assetKey: string, emp: string, at: Date, endedAt: Date, endReason: "TRANSFERRED" | "RETURNED" | "LOST", condition: AssetCondition, accessories: string[]) => {
    const g = await prisma.assignment.create({
      data: {
        assetId: id[assetKey], employeeId: id[emp], departmentId: id[deptOfEmp[emp]], locationId: id[locOfEmp[emp]],
        assignedById: MGR, assignedAt: at, conditionAtAssignment: condition, accessories,
        handoverStatus: "CONFIRMED", handoverDate: at, handoverConfirmedAt: new Date(at.getTime() + DAY),
        isActive: false, endedAt, endReason,
      },
    });
    id[key] = g.id;
  };
  await past("g-old1", "a1", "e10", d(-190, 10, 45), d(-52, 16, 5), "TRANSFERRED", "NEW", ["Charger", "Laptop bag"]);
  await past("g-old5", "a5", "e10", d(-380), d(-1, 15, 40), "RETURNED", "GOOD", ["Charger", "Laptop bag"]);
  await past("g-old10", "a10", "e10", d(-480), d(-40), "LOST", "GOOD", ["Charger"]);
  await past("g-old9", "a9", "e3", d(-1400), d(-229), "RETURNED", "GOOD", ["Charger"]);
  await past("g-old8", "a8", "e13", d(-880), d(-151), "RETURNED", "GOOD", ["Charger", "Laptop bag"]);

  console.log("Transfers…");
  const transfers = [
    { no: "TRF-0007", asset: "a1", from: "e10", to: "e2", reason: "Rahul received a Latitude 7440 upgrade.", status: "COMPLETED", at: d(-53, 15), by: "Karthik Raman", reviewedAt: d(-52, 16), remarks: "Approved", newAsg: "ga1" },
    { no: "TRF-0008", asset: "a24", from: "e6", to: "e8", reason: "Swap phones between field reps.", status: "REJECTED", at: d(-41), by: "Vignesh R", reviewedAt: d(-40), remarks: "Phones are issued per person; raise a replacement request instead." },
    { no: "TRF-0009", asset: "a17", from: "e4", to: "e9", reason: "Kavya needs a second monitor for design reviews. Meena is moving to a laptop-only setup this quarter.", status: "REQUESTED", at: d(-2, 15, 10), by: "Meena Pillai" },
    { no: "TRF-0010", asset: "a13", from: "e9", to: "e14", reason: "Nisha joins the Bengaluru build team; Kavya is getting a MacBook.", status: "REQUESTED", at: d(-1, 11, 40), by: "Karthik Raman" },
  ] as const;
  for (const t of transfers) {
    await prisma.assetTransfer.create({
      data: {
        transferNo: t.no, assetId: id[t.asset], reason: t.reason, status: t.status, requestedAt: t.at,
        fromEmployeeId: id[t.from], toEmployeeId: id[t.to],
        fromDepartmentId: id[deptOfEmp[t.from]], toDepartmentId: id[deptOfEmp[t.to]],
        fromLocationId: id[locOfEmp[t.from]], toLocationId: id[locOfEmp[t.to]],
        requestedById: actor(t.by),
        reviewedById: "reviewedAt" in t ? MGR : null,
        reviewedAt: "reviewedAt" in t ? t.reviewedAt : null,
        reviewRemarks: "remarks" in t ? t.remarks : null,
        completedAt: t.status === "COMPLETED" ? d(-51, 9, 40) : null,
        newAssignmentId: "newAsg" in t ? id[t.newAsg] : null,
      },
    });
  }
  hist("a1", d(-52, 16, 5), "TRANSFERRED", "TRF-0007 · Rahul V → Priya Sundaram", "Karthik Raman", "ASSIGNED", "ASSIGNED");
  hist("a24", d(-41), "TRANSFER_REQUESTED", "TRF-0008 · to Harish M", "Vignesh R");
  hist("a24", d(-40), "TRANSFER_REJECTED", "TRF-0008 · Phones are issued per person", "Karthik Raman");
  hist("a17", d(-2, 15, 10), "TRANSFER_REQUESTED", "TRF-0009 · to Kavya S", "Meena Pillai");
  hist("a13", d(-1, 11, 40), "TRANSFER_REQUESTED", "TRF-0010 · to Nisha Rao", "Karthik Raman");

  console.log("Issues…");
  const issues = [
    { key: "i21", no: "ISS-0021", asset: "a1", emp: "e10", category: "HARDWARE", title: "Several keys not responding", desc: "Keys J, K and L stop working intermittently.", severity: "HIGH", status: "CLOSED", at: d(-104, 11, 20), resolution: "Keyboard replaced under warranty", resolvedAt: d(-97, 14, 30) },
    { key: "i29", no: "ISS-0029", asset: "a21", emp: "e7", category: "SOFTWARE", title: "Excel crashes on large files", desc: "Crashes on files over 50 MB.", severity: "MEDIUM", status: "RESOLVED", at: d(-20), resolution: "RAM upgraded to 32 GB", resolvedAt: d(-7) },
    { key: "i31", no: "ISS-0031", asset: "a2", emp: "e1", category: "BATTERY", title: "Battery drains within an hour", desc: "Battery goes from 100% to 10% in about 50 minutes even on light use.", severity: "CRITICAL", status: "MAINTENANCE", at: d(-1, 10, 5) },
    { key: "i33", no: "ISS-0033", asset: "a20", emp: "e9", category: "HARDWARE", title: "Screen flickers at 60 Hz", desc: "Flicker on DisplayPort; fine on HDMI.", severity: "HIGH", status: "MAINTENANCE", at: d(-6) },
    { key: "i34", no: "ISS-0034", asset: "a27", emp: "e6", category: "HARDWARE", title: "Microphone cuts out on calls", desc: "Customers can't hear me; the mic drops every few seconds.", severity: "MEDIUM", status: "REPORTED", at: d(-3) },
    { key: "i35", no: "ISS-0035", asset: "a13", emp: "e9", category: "NETWORK", title: "Wi-Fi drops after sleep", desc: "After the laptop wakes up, Wi-Fi needs a restart to connect.", severity: "LOW", status: "UNDER_REVIEW", at: d(-5) },
    { key: "i36", no: "ISS-0036", asset: "a12", emp: "e11", category: "HARDWARE", title: "Dock doesn't detect second display", desc: "Second monitor stays black through the dock.", severity: "LOW", status: "REPORTED", at: d(-1, 16) },
  ] as const;
  for (const x of issues) {
    const row = await prisma.assetIssue.create({
      data: {
        issueNo: x.no, assetId: id[x.asset], reportedById: id[x.emp], category: x.category, title: x.title,
        description: x.desc, severity: x.severity, status: x.status, reportedAt: x.at,
        handledById: x.status === "REPORTED" ? null : MGR,
        resolution: "resolution" in x ? x.resolution : null,
        resolvedAt: "resolvedAt" in x ? x.resolvedAt : null,
      },
    });
    id[x.key] = row.id;
    hist(x.asset, x.at, "ISSUE_REPORTED", `${x.no} · ${x.title}`, nameOfEmp[x.emp]);
  }

  console.log("Maintenance…");
  const maint = [
    { no: "MNT-0010", asset: "a8", issue: null, problem: "Hinge broken, beyond repair", type: "REPAIR", provider: "Dell Service, Guindy", date: d(-150), cost: 1200, parts: null, notes: "Not economical to repair", warranty: false, expected: d(-145), actual: d(-145), status: "COMPLETED", before: "RETURNED" },
    { no: "MNT-0012", asset: "a1", issue: "i21", problem: "Keyboard replaced", type: "WARRANTY_CLAIM", provider: "Dell Service, Guindy", date: d(-103), cost: 0, parts: "Keyboard assembly", notes: null, warranty: true, expected: d(-97), actual: d(-97), status: "COMPLETED", before: "ASSIGNED" },
    { no: "MNT-0014", asset: "a21", issue: "i29", problem: "RAM upgrade to 32 GB", type: "UPGRADE", provider: "In-house IT", date: d(-9), cost: 11600, parts: "2× 16 GB DDR5", notes: null, warranty: false, expected: d(-7), actual: d(-7), status: "COMPLETED", before: "ASSIGNED" },
    { no: "MNT-0015", asset: "a2", issue: "i31", problem: "Battery replacement", type: "REPAIR", provider: "Lenovo Service Centre, Guindy", date: d(-1, 16), cost: 6800, parts: "Battery 57 Wh", notes: null, warranty: false, expected: ahead(5), actual: null, status: "IN_PROGRESS", before: "ASSIGNED" },
    { no: "MNT-0016", asset: "a20", issue: "i33", problem: "Screen flicker", type: "WARRANTY_CLAIM", provider: "BenQ Care, T. Nagar", date: d(-4), cost: 0, parts: null, notes: null, warranty: true, expected: d(-2), actual: null, status: "SCHEDULED", before: "AVAILABLE" },
  ] as const;
  for (const m of maint) {
    await prisma.maintenanceRecord.create({
      data: {
        maintenanceNo: m.no, assetId: id[m.asset], issueId: m.issue ? id[m.issue] : null, problem: m.problem,
        type: m.type, serviceProvider: m.provider, serviceDate: m.date, cost: m.cost, partsReplaced: m.parts,
        technicianNotes: m.notes, warrantyCovered: m.warranty, expectedCompletion: m.expected,
        actualCompletion: m.actual, status: m.status, statusBefore: m.before, createdById: MGR,
      },
    });
  }
  hist("a1", d(-103), "MAINTENANCE_STARTED", "MNT-0012 · Keyboard replacement · Dell Service", "Karthik Raman", "ASSIGNED", "UNDER_MAINTENANCE");
  hist("a1", d(-97, 14, 30), "MAINTENANCE_COMPLETED", "MNT-0012 · Keyboard replaced · ₹0 (warranty)", "Karthik Raman", "UNDER_MAINTENANCE", "ASSIGNED");
  hist("a21", d(-9), "MAINTENANCE_STARTED", "MNT-0014 · RAM upgrade · In-house IT", "Karthik Raman", "ASSIGNED", "UNDER_MAINTENANCE");
  hist("a21", d(-7), "MAINTENANCE_COMPLETED", "MNT-0014 · RAM upgraded to 32 GB · ₹11,600", "Karthik Raman", "UNDER_MAINTENANCE", "ASSIGNED");
  hist("a2", d(-1, 16, 15), "MAINTENANCE_STARTED", "MNT-0015 · Battery replacement · Lenovo Service Centre", "Karthik Raman", "ASSIGNED", "UNDER_MAINTENANCE");
  hist("a20", d(-4), "MAINTENANCE_STARTED", "MNT-0016 · Screen flicker · BenQ Care", "Karthik Raman", "AVAILABLE", "UNDER_MAINTENANCE");

  console.log("Returns, inspections, retirements…");
  const returns = [
    { key: "r9", no: "RET-0009", asset: "a9", emp: "e3", asg: "g-old9", status: "INSPECTED", reason: "Battery dead", at: d(-230), receivedAt: d(-229), condition: "POOR", missing: [], damage: "Battery won't hold charge" },
    { key: "r10", no: "RET-0010", asset: "a8", emp: "e13", asg: "g-old8", status: "INSPECTED", reason: "Hinge broken", at: d(-152), receivedAt: d(-151), condition: "DAMAGED", missing: [], damage: "Hinge snapped" },
    { key: "r13", no: "RET-0013", asset: "a5", emp: "e10", asg: "g-old5", status: "RECEIVED", reason: "Upgraded to Latitude 7440", at: d(-3), receivedAt: d(-1, 15, 40), condition: "FAIR", missing: ["Laptop bag"], damage: "Scratches on the lid" },
    { key: "r14", no: "RET-0014", asset: "a1", emp: "e2", asg: "ga1", status: "REQUESTED", reason: "Moving to the Coimbatore office from 1 Nov.", at: d(0, 10, 12) },
  ] as const;
  for (const r of returns) {
    const row = await prisma.assetReturn.create({
      data: {
        returnNo: r.no, assetId: id[r.asset], assignmentId: id[r.asg], returnedById: id[r.emp], status: r.status,
        reason: r.reason, requestedAt: r.at,
        receivedAt: "receivedAt" in r ? r.receivedAt : null,
        receivedById: "receivedAt" in r ? MGR : null,
        condition: "condition" in r ? r.condition : null,
        missingAccessories: "missing" in r ? [...r.missing] : [],
        damage: "damage" in r ? r.damage : null,
      },
    });
    id[r.key] = row.id;
  }
  hist("a9", d(-229), "RETURNED", "RET-0009 · received from Sanjay Krishnan", "Karthik Raman", "ASSIGNED", "RETURNED");
  hist("a8", d(-151), "RETURNED", "RET-0010 · received from Gokul P · hinge snapped", "Karthik Raman", "ASSIGNED", "RETURNED");
  hist("a5", d(-3), "RETURN_REQUESTED", "RET-0013 · Upgraded to Latitude 7440", "Rahul V");
  hist("a5", d(-1, 15, 40), "RETURNED", "RET-0013 · received from Rahul V · laptop bag missing", "Karthik Raman", "ASSIGNED", "RETURNED");
  hist("a1", d(0, 10, 12), "RETURN_REQUESTED", "RET-0014 · Moving to the Coimbatore office", "Priya Sundaram");

  await prisma.assetInspection.create({
    data: {
      assetId: id["a9"], returnId: id["r9"], inspectedById: MGR, inspectedAt: d(-228, 11), physicalCondition: "POOR",
      batteryCondition: "Won't hold charge", chargerAvailable: true, accessoriesPresent: ["Charger"], isFunctional: false,
      remarks: "Out of warranty, battery replacement not economical", result: "RETIRE",
    },
  });
  hist("a9", d(-228, 11), "INSPECTED", "RET-0009 · Retire", "Karthik Raman", "RETURNED", "RETIRED");
  await prisma.assetInspection.create({
    data: {
      assetId: id["a8"], returnId: id["r10"], inspectedById: MGR, inspectedAt: d(-151, 15), physicalCondition: "DAMAGED",
      screenCondition: "OK", chargerAvailable: true, accessoriesPresent: ["Charger", "Laptop bag"], isFunctional: true,
      visibleDamage: "Hinge snapped", result: "DAMAGED",
    },
  });
  hist("a8", d(-151, 15), "INSPECTED", "RET-0010 · Damaged", "Karthik Raman", "RETURNED", "DAMAGED");
  hist("a10", d(-40), "MARKED_LOST", "Reported lost by Rahul V after travel", "Karthik Raman", "ASSIGNED", "LOST");

  await prisma.assetRetirement.create({
    data: { assetId: id["a9"], retirementDate: d(-228), reason: "Battery dead, out of warranty", finalCondition: "POOR", disposalMethod: "RECYCLED", authorizedById: MGR },
  });
  await prisma.assetRetirement.create({
    data: { assetId: id["a33"], retirementDate: d(-260), reason: "End of life", finalCondition: "POOR", disposalMethod: "DONATED", authorizedById: id["u-admin"], remarks: "Donated to a local school" },
  });
  hist("a9", d(-228), "RETIRED", "Retired · recycled", "Karthik Raman", "RETURNED", "RETIRED");
  hist("a33", d(-260), "RETIRED", "Retired · donated", "Anitha Joseph", "AVAILABLE", "RETIRED");

  console.log("Requests…");
  const requests = [
    { no: "REQ-0035", type: "NEW_ASSET", emp: "e1", asset: "a16", title: "Second monitor for code reviews", desc: "A second screen would help with code reviews.", priority: "LOW", status: "COMPLETED", at: d(-14), remark: "Assigned a Dell P2422H. Please sign the handover." },
    { no: "REQ-0036", type: "ISSUE", emp: "e9", asset: "a13", issue: "i35", title: "Wi-Fi drops after sleep", desc: "After the laptop wakes up, Wi-Fi needs a restart.", priority: "LOW", status: "IN_PROGRESS", at: d(-5), remark: "Driver update scheduled for Friday." },
    { no: "REQ-0038", type: "REPLACEMENT", emp: "e6", asset: "a27", title: "Headset microphone cuts out", desc: "Customers can't hear me on calls.", priority: "MEDIUM", status: "PENDING", at: d(-3) },
    { no: "REQ-0039", type: "NEW_ASSET", emp: "e5", asset: null, title: "Laptop for new joiner", desc: "I joined Engineering on 20 Oct and need a development laptop.", priority: "HIGH", status: "APPROVED", at: d(-3), remark: "Reserved IdeaPad Slim 5 (AST-LAP-0007) for you." },
    { no: "REQ-0040", type: "ISSUE", emp: "e1", asset: "a2", issue: "i31", title: "Battery drains within an hour", desc: "Battery goes from 100% to 10% in about 50 minutes.", priority: "URGENT", status: "IN_PROGRESS", at: d(-1, 10, 5), remark: "Sent to Lenovo Service Centre, Guindy. Expected back in 5 days." },
    { no: "REQ-0041", type: "RETURN", emp: "e2", asset: "a1", ret: "r14", title: "Return Dell Latitude 5440", desc: "I'm moving to the Coimbatore office from 1 Nov.", priority: "MEDIUM", status: "PENDING", at: d(0, 10, 12) },
  ] as const;
  for (const q of requests) {
    await prisma.employeeRequest.create({
      data: {
        requestNo: q.no, type: q.type, title: q.title, description: q.desc, priority: q.priority, status: q.status,
        createdAt: q.at, employeeId: id[q.emp], assetId: q.asset ? id[q.asset] : null,
        issueId: "issue" in q ? id[q.issue] : null,
        returnId: "ret" in q ? id[q.ret] : null,
        managerRemarks: "remark" in q ? q.remark : null,
        handledById: q.status === "PENDING" ? null : MGR,
        resolvedAt: q.status === "COMPLETED" ? d(-1) : null,
      },
    });
  }

  console.log("Notifications…");
  const notes: [string, NotificationType, string, string, string, Date, boolean?][] = [
    ["u-mgr", "RETURN_REQUESTED", "Return requested", "Priya Sundaram wants to return AST-LAP-0001", "/returns", d(0, 10, 12)],
    ["u-mgr", "ISSUE_STATUS_UPDATED", "Critical issue reported", "Battery drains within an hour · Arun Kumar", "/issues", d(-1, 10, 5)],
    ["u-mgr", "WARRANTY_EXPIRING", "Warranty ends in 3 days", "Lenovo ThinkPad E14 · AST-LAP-0003", `/assets/${id["a3"]}`, d(0, 8)],
    ["u-mgr", "TRANSFER_REQUESTED", "Transfer requested", "LG 27UL500 from Meena Pillai to Kavya S", "/transfers", d(-2, 15, 10)],
    ["u-mgr", "GENERAL", "Maintenance overdue", "BenQ GW2790 was expected back 2 days ago", "/maintenance", d(-1, 9), true],
    ["u-emp", "ASSET_ASSIGNED", "Dell P2422H assigned to you", "Monitor · AST-MON-0001 · please confirm and sign the handover", `/my-assets/handover/${id["ga16"]}`, d(0, 9, 40)],
    ["u-emp", "ISSUE_STATUS_UPDATED", "Your laptop's repair started", "Lenovo Service Centre, Guindy · back in about 5 days", "/my-requests", d(-1, 16, 15)],
    ["u-admin", "GENERAL", "New employee without a login", "Divya Natarajan has no user account yet", "/admin/users", d(-1, 12)],
  ];
  await prisma.notification.createMany({
    data: notes.map(([u, type, title, message, link, at, read]) => ({ userId: id[u], type, title, message, link, createdAt: at, isRead: !!read })),
  });

  await prisma.assetHistory.createMany({ data: history.sort((a, b) => +new Date(a.createdAt!) - +new Date(b.createdAt!)) });

  console.log("Sequences & settings…");
  const seq: Record<string, number> = { REQ: 41, TRF: 10, ISS: 36, MNT: 16, RET: 14, EMP: 14 };
  for (const [cat, n] of Object.entries(counters)) seq[`AST-${cat}`] = n;
  await prisma.sequence.createMany({ data: Object.entries(seq).map(([name, value]) => ({ name, value })) });
  await prisma.setting.createMany({
    data: [
      { key: "orgName", value: "Adz4needz" },
      { key: "assetTagPrefix", value: "AST" },
      { key: "warrantyAlertDays", value: "30" },
      { key: "uiSkin", value: "warm" },
    ],
  });

  console.log(`Done: ${ASSETS.length} assets, ${EMPLOYEES.length} employees, ${USERS.length} users, ${history.length} history rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
