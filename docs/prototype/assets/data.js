/* AssetTrace prototype — seed data. Dates are generated relative to "today" so the demo always looks current. */
(function () {
  var DAY = 864e5;
  function d(offsetDays, h, m) {
    var t = new Date(); t.setHours(h == null ? 10 : h, m == null ? 0 : m, 0, 0);
    return new Date(t.getTime() + offsetDays * DAY).toISOString();
  }

  function seed() {
    var S = {
      v: 3,
      settings: { orgName: "Adz4needz", prefix: "AST", warrantyDays: 30 },
      departments: [
        { id: "d-eng", name: "Engineering", code: "ENG", managers: ["u-mgr"], active: true },
        { id: "d-it", name: "IT", code: "IT", managers: ["u-mgr", "u-lak"], active: true },
        { id: "d-des", name: "Design", code: "DES", managers: ["u-mgr"], active: true },
        { id: "d-sal", name: "Sales", code: "SAL", managers: [], active: true },
        { id: "d-ops", name: "Operations", code: "OPS", managers: [], active: true }
      ],
      locations: [
        { id: "l-chn", name: "Chennai HQ", code: "CHN", address: "Guindy, Chennai 600032", active: true },
        { id: "l-cbe", name: "Coimbatore", code: "CBE", address: "Peelamedu, Coimbatore 641004", active: true },
        { id: "l-blr", name: "Bengaluru", code: "BLR", address: "HSR Layout, Bengaluru 560102", active: true }
      ],
      categories: [
        ["LAP", "Laptop"], ["DES", "Desktop"], ["MON", "Monitor"], ["MOB", "Mobile phone"], ["TAB", "Tablet"], ["KEY", "Keyboard"],
        ["MOU", "Mouse"], ["HEA", "Headset"], ["PRN", "Printer"], ["RTR", "Router"], ["PRJ", "Projector"], ["OTH", "Other"]
      ].map(function (c) { return { id: "c-" + c[0], code: c[0], name: c[1], active: true }; }),
      vendors: [
        { id: "v1", name: "Dell Technologies India", contact: "Rohit Mehta", phone: "+91 80 4100 1100", active: true },
        { id: "v2", name: "Lenovo India", contact: "Asha Menon", phone: "+91 80 4930 2200", active: true },
        { id: "v3", name: "HP India", contact: "Vikram Rao", phone: "+91 80 3030 4040", active: true },
        { id: "v4", name: "Redington", contact: "Sales desk", phone: "+91 44 4224 3353", active: true },
        { id: "v5", name: "Croma Business", contact: "B2B team", phone: "+91 22 6125 0000", active: true }
      ],
      employees: [
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
        ["e14", "EMP-0014", "Nisha Rao", "Engineer", "d-eng", "l-blr"]
      ].map(function (e) { return { id: e[0], code: e[1], name: e[2], title: e[3], deptId: e[4], locId: e[5], email: e[2].split(" ")[0].toLowerCase() + "@adz4needz.in", active: true }; }),
      users: [
        { id: "u-admin", email: "admin@assettrace.dev", name: "Anitha Joseph", role: "ADMIN", empId: "e12", active: true, last: d(0, 8, 41) },
        { id: "u-mgr", email: "manager@assettrace.dev", name: "Karthik Raman", role: "MANAGER", empId: "e11", active: true, last: d(0, 9, 2) },
        { id: "u-lak", email: "lakshmi@adz4needz.in", name: "Lakshmi Iyer", role: "MANAGER", empId: "e7", active: true, last: d(-1, 17, 10) },
        { id: "u-emp", email: "employee@assettrace.dev", name: "Arun Kumar", role: "EMPLOYEE", empId: "e1", active: true, last: d(0, 10, 20) },
        { id: "u-priya", email: "priya@adz4needz.in", name: "Priya Sundaram", role: "EMPLOYEE", empId: "e2", active: true, last: d(0, 10, 11) },
        { id: "u-kavya", email: "kavya@adz4needz.in", name: "Kavya S", role: "EMPLOYEE", empId: "e9", active: true, last: d(0, 9, 30) },
        { id: "u-vig", email: "vignesh@adz4needz.in", name: "Vignesh R", role: "EMPLOYEE", empId: "e6", active: true, last: d(-3, 12, 0) }
      ],
      assets: [], assignments: [], transfers: [], issues: [], maintenance: [], returns: [], inspections: [], retirements: [],
      requests: [], history: [], notifications: [], seq: {}
    };

    // [code, name, brand, model, serial, status, holder, loc, dept, cond, purchasedDaysAgo, cost, warrantyEndsInDays, vendor, assignedDaysAgo, handover]
    var A = [
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
      ["MOB", "Redmi Note 12", "Xiaomi", "Redmi Note 12", "RN12XA77123", "ASSIGNED", "e13", "l-cbe", "d-ops", "GOOD", 200, 15999, 165, "v5", 199, "CONFIRMED"]
    ];
    var ACC = { LAP: ["Charger", "Laptop bag"], MON: ["HDMI cable", "Power cable"], MOB: ["Charger", "Case"], HEA: ["USB dongle"], DES: ["Keyboard", "Mouse"], TAB: ["Charger"] };
    var counters = {};
    A.forEach(function (r, i) {
      counters[r[0]] = (counters[r[0]] || 0) + 1;
      var id = "a" + (i + 1);
      var tag = "AST-" + r[0] + "-" + String(counters[r[0]]).padStart(4, "0");
      S.assets.push({
        id: id, tag: tag, name: r[1], brand: r[2], model: r[3], serial: r[4], status: r[5], holderId: r[6],
        locId: r[7], deptId: r[8], condition: r[9], purchaseDate: d(-r[10]), cost: r[11],
        warrantyStart: d(-r[10]), warrantyEnd: d(r[12]), vendorId: r[13], catId: "c-" + r[0],
        notes: r[0] === "LAP" ? "16 GB RAM · 512 GB SSD" : "", qr: "q" + Math.random().toString(36).slice(2, 10)
      });
      S.history.push({ id: "h" + S.history.length, assetId: id, at: d(-r[10] + 2, 15, 15), event: "REGISTERED", text: "Registered as Available · ₹" + r[11].toLocaleString("en-IN"), by: "Karthik Raman" });
      if (r[6]) {
        var asg = { id: "g" + id, assetId: id, empId: r[6], at: d(-r[14], 10, 45), expected: d(-r[14] + 365), condition: r[9], accessories: ACC[r[0]] || [], remarks: "", handover: r[15], handoverAt: r[15] === "CONFIRMED" ? d(-r[14] + 1, 9, 40) : null, active: true, by: "u-mgr" };
        S.assignments.push(asg);
        S.history.push({ id: "h" + S.history.length, assetId: id, at: asg.at, event: "ASSIGNED", text: "Assigned to " + empName(S, r[6]), by: "Karthik Raman" });
        if (r[15] === "CONFIRMED") S.history.push({ id: "h" + S.history.length, assetId: id, at: asg.handoverAt, event: "HANDOVER_CONFIRMED", text: "Handover signed · " + (asg.accessories.join(", ") || "no accessories"), by: empName(S, r[6]) });
        if (r[15] === "DISPUTED") { asg.note = "Mouse was missing from the kit"; S.history.push({ id: "h" + S.history.length, assetId: id, at: d(-349, 11), event: "HANDOVER_DISPUTED", text: "Disputed: mouse missing from the kit", by: empName(S, r[6]) }); }
      }
    });
    // Overdue expected returns for two assets
    byTag(S, "AST-LAP-0003").__a && 0;
    setExpected(S, "a3", d(-8)); setExpected(S, "a6", d(-3));
    // Earlier assignment of a1 to Rahul, transferred
    S.assignments.push({ id: "g-old1", assetId: "a1", empId: "e10", at: d(-190, 10, 45), expected: null, condition: "NEW", accessories: ["Charger", "Laptop bag"], handover: "CONFIRMED", handoverAt: d(-189, 12), active: false, endedAt: d(-52, 16, 5), endReason: "TRANSFERRED", by: "u-mgr" });
    S.assignments.push({ id: "g-old5", assetId: "a5", empId: "e10", at: d(-380), condition: "GOOD", accessories: ["Charger", "Laptop bag"], handover: "CONFIRMED", active: false, endedAt: d(-1, 15, 40), endReason: "RETURNED", by: "u-mgr" });
    S.assignments.push({ id: "g-old10", assetId: "a10", empId: "e10", at: d(-480), condition: "GOOD", accessories: ["Charger"], handover: "CONFIRMED", active: false, endedAt: d(-40), endReason: "LOST", by: "u-mgr" });

    S.transfers = [
      { id: "t7", no: "TRF-0007", assetId: "a1", fromEmp: "e10", toEmp: "e2", reason: "Rahul received a Latitude 7440 upgrade.", status: "COMPLETED", at: d(-53, 15), by: "Karthik Raman", reviewedAt: d(-52, 16), remarks: "Approved" },
      { id: "t8", no: "TRF-0008", assetId: "a24", fromEmp: "e6", toEmp: "e8", reason: "Swap phones between field reps.", status: "REJECTED", at: d(-41), by: "Vignesh R", reviewedAt: d(-40), remarks: "Phones are issued per person; raise a replacement request instead." },
      { id: "t9", no: "TRF-0009", assetId: "a17", fromEmp: "e4", toEmp: "e9", reason: "Kavya needs a second monitor for design reviews. Meena is moving to a laptop-only setup this quarter.", status: "REQUESTED", at: d(-2, 15, 10), by: "Meena Pillai" },
      { id: "t10", no: "TRF-0010", assetId: "a13", fromEmp: "e9", toEmp: "e14", reason: "Nisha joins the Bengaluru build team; Kavya is getting a MacBook.", status: "REQUESTED", at: d(-1, 11, 40), by: "Karthik Raman" }
    ];
    hist(S, "a1", d(-52, 16, 5), "TRANSFERRED", "TRF-0007 · Rahul V → Priya Sundaram", "Karthik Raman");
    hist(S, "a17", d(-2, 15, 10), "TRANSFER_REQUESTED", "TRF-0009 · to Kavya S", "Meena Pillai");

    S.issues = [
      { id: "i21", no: "ISS-0021", assetId: "a1", empId: "e10", category: "HARDWARE", title: "Several keys not responding", desc: "Keys J, K and L stop working intermittently.", severity: "HIGH", status: "CLOSED", at: d(-104, 11, 20), resolution: "Keyboard replaced under warranty" },
      { id: "i29", no: "ISS-0029", assetId: "a21", empId: "e7", category: "SOFTWARE", title: "Excel crashes on large files", desc: "Crashes on files over 50 MB.", severity: "MEDIUM", status: "RESOLVED", at: d(-20), resolution: "RAM upgraded to 32 GB" },
      { id: "i31", no: "ISS-0031", assetId: "a2", empId: "e1", category: "BATTERY", title: "Battery drains within an hour", desc: "Battery goes from 100% to 10% in about 50 minutes even on light use.", severity: "CRITICAL", status: "MAINTENANCE", at: d(-1, 10, 5) },
      { id: "i33", no: "ISS-0033", assetId: "a20", empId: "e9", category: "HARDWARE", title: "Screen flickers at 60 Hz", desc: "Flicker on DisplayPort; fine on HDMI.", severity: "HIGH", status: "MAINTENANCE", at: d(-6) },
      { id: "i34", no: "ISS-0034", assetId: "a27", empId: "e6", category: "HARDWARE", title: "Microphone cuts out on calls", desc: "Customers can't hear me; the mic drops every few seconds.", severity: "MEDIUM", status: "REPORTED", at: d(-3) },
      { id: "i35", no: "ISS-0035", assetId: "a13", empId: "e9", category: "NETWORK", title: "Wi-Fi drops after sleep", desc: "After the laptop wakes up, Wi-Fi needs a restart to connect.", severity: "LOW", status: "UNDER_REVIEW", at: d(-5) },
      { id: "i36", no: "ISS-0036", assetId: "a12", empId: "e11", category: "HARDWARE", title: "Dock doesn't detect second display", desc: "Second monitor stays black through the dock.", severity: "LOW", status: "REPORTED", at: d(-1, 16) }
    ];
    hist(S, "a1", d(-104, 11, 20), "ISSUE_REPORTED", "ISS-0021 · Several keys not responding · High", "Rahul V");
    hist(S, "a2", d(-1, 10, 5), "ISSUE_REPORTED", "ISS-0031 · Battery drains within an hour · Critical", "Arun Kumar");

    S.maintenance = [
      { id: "m10", no: "MNT-0010", assetId: "a8", issueId: null, problem: "Hinge broken, beyond repair", type: "REPAIR", provider: "Dell Service, Guindy", date: d(-150), cost: 1200, parts: "", notes: "Not economical to repair", warranty: false, expected: d(-145), actual: d(-145), status: "COMPLETED", before: "ASSIGNED" },
      { id: "m12", no: "MNT-0012", assetId: "a1", issueId: "i21", problem: "Keyboard replaced", type: "WARRANTY_CLAIM", provider: "Dell Service, Guindy", date: d(-103), cost: 0, parts: "Keyboard assembly", notes: "", warranty: true, expected: d(-97), actual: d(-97), status: "COMPLETED", before: "ASSIGNED" },
      { id: "m14", no: "MNT-0014", assetId: "a21", issueId: "i29", problem: "RAM upgrade to 32 GB", type: "UPGRADE", provider: "In-house IT", date: d(-9), cost: 11600, parts: "2× 16 GB DDR5", notes: "", warranty: false, expected: d(-7), actual: d(-7), status: "COMPLETED", before: "ASSIGNED" },
      { id: "m15", no: "MNT-0015", assetId: "a2", issueId: "i31", problem: "Battery replacement", type: "REPAIR", provider: "Lenovo Service Centre, Guindy", date: d(-1, 16), cost: 6800, parts: "Battery 57 Wh", notes: "", warranty: false, expected: d(5), actual: null, status: "IN_PROGRESS", before: "ASSIGNED" },
      { id: "m16", no: "MNT-0016", assetId: "a20", issueId: "i33", problem: "Screen flicker", type: "WARRANTY_CLAIM", provider: "BenQ Care, T. Nagar", date: d(-4), cost: 0, parts: "", notes: "", warranty: true, expected: d(-2), actual: null, status: "SCHEDULED", before: "AVAILABLE" }
    ];
    hist(S, "a1", d(-97, 14, 30), "MAINTENANCE_COMPLETED", "MNT-0012 · Keyboard replaced · ₹0 (warranty)", "Karthik Raman");
    hist(S, "a2", d(-1, 16, 15), "MAINTENANCE_STARTED", "MNT-0015 · Battery replacement · Lenovo Service Centre", "Karthik Raman");

    S.returns = [
      { id: "r9", no: "RET-0009", assetId: "a9", empId: "e3", status: "INSPECTED", reason: "Battery dead", at: d(-230), receivedAt: d(-229), condition: "POOR", missing: [], damage: "Battery won't hold charge", result: "RETIRE" },
      { id: "r10", no: "RET-0010", assetId: "a8", empId: "e13", status: "INSPECTED", reason: "Hinge broken", at: d(-152), receivedAt: d(-151), condition: "DAMAGED", missing: [], damage: "Hinge snapped", result: "DAMAGED" },
      { id: "r13", no: "RET-0013", assetId: "a5", empId: "e10", status: "RECEIVED", reason: "Upgraded to Latitude 7440", at: d(-3), receivedAt: d(-1, 15, 40), condition: "FAIR", missing: ["Laptop bag"], damage: "Scratches on the lid", accessories: ["Charger", "Laptop bag"] },
      { id: "r14", no: "RET-0014", assetId: "a1", empId: "e2", status: "REQUESTED", reason: "Moving to the Coimbatore office from 1 Nov.", at: d(0, 10, 12) }
    ];
    hist(S, "a5", d(-1, 15, 40), "RETURNED", "RET-0013 · received from Rahul V · laptop bag missing", "Karthik Raman");
    hist(S, "a1", d(0, 10, 12), "RETURN_REQUESTED", "RET-0014 · Moving to the Coimbatore office", "Priya Sundaram");
    S.retirements = [
      { assetId: "a9", date: d(-228), reason: "Battery dead, out of warranty", condition: "POOR", disposal: "RECYCLED", by: "Karthik Raman", remarks: "" },
      { assetId: "a33", date: d(-260), reason: "End of life", condition: "POOR", disposal: "DONATED", by: "Anitha Joseph", remarks: "Donated to a local school" }
    ];
    hist(S, "a9", d(-228), "RETIRED", "Retired · recycled", "Karthik Raman");
    hist(S, "a33", d(-260), "RETIRED", "Retired · donated", "Anitha Joseph");
    hist(S, "a10", d(-40), "MARKED_LOST", "Reported lost by Rahul V after travel", "Karthik Raman");

    S.requests = [
      { id: "q35", no: "REQ-0035", type: "NEW_ASSET", empId: "e1", assetId: "a16", title: "Second monitor for code reviews", desc: "A second screen would help with code reviews.", priority: "LOW", status: "COMPLETED", at: d(-14), remark: "Assigned a Dell P2422H. Please sign the handover." },
      { id: "q36", no: "REQ-0036", type: "ISSUE", empId: "e9", assetId: "a13", issueId: "i35", title: "Wi-Fi drops after sleep", desc: "After the laptop wakes up, Wi-Fi needs a restart.", priority: "LOW", status: "IN_PROGRESS", at: d(-5), remark: "Driver update scheduled for Friday." },
      { id: "q38", no: "REQ-0038", type: "REPLACEMENT", empId: "e6", assetId: "a27", title: "Headset microphone cuts out", desc: "Customers can't hear me on calls.", priority: "MEDIUM", status: "PENDING", at: d(-3), remark: "" },
      { id: "q39", no: "REQ-0039", type: "NEW_ASSET", empId: "e5", assetId: null, title: "Laptop for new joiner", desc: "I joined Engineering on 20 Oct and need a development laptop.", priority: "HIGH", status: "APPROVED", at: d(-3), remark: "Reserved IdeaPad Slim 5 (AST-LAP-0007) for you." },
      { id: "q40", no: "REQ-0040", type: "ISSUE", empId: "e1", assetId: "a2", issueId: "i31", title: "Battery drains within an hour", desc: "Battery goes from 100% to 10% in about 50 minutes.", priority: "URGENT", status: "IN_PROGRESS", at: d(-1, 10, 5), remark: "Sent to Lenovo Service Centre, Guindy. Expected back in 5 days." },
      { id: "q41", no: "REQ-0041", type: "RETURN", empId: "e2", assetId: "a1", returnId: "r14", title: "Return Dell Latitude 5440", desc: "I'm moving to the Coimbatore office from 1 Nov.", priority: "MEDIUM", status: "PENDING", at: d(0, 10, 12), remark: "" }
    ];

    S.notifications = [
      n("u-mgr", "RETURN", "Return requested", "Priya Sundaram wants to return AST-LAP-0001", "#/returns", d(0, 10, 12)),
      n("u-mgr", "ISSUE", "Critical issue reported", "Battery drains within an hour · Arun Kumar", "#/issues", d(-1, 10, 5)),
      n("u-mgr", "WARRANTY", "Warranty ends in 3 days", "Lenovo ThinkPad E14 · AST-LAP-0003", "#/assets/a3", d(0, 8)),
      n("u-mgr", "TRANSFER", "Transfer requested", "LG 27UL500 from Meena Pillai to Kavya S", "#/transfers", d(-2, 15, 10)),
      n("u-mgr", "MAINT", "Maintenance overdue", "BenQ GW2790 was expected back 2 days ago", "#/maintenance", d(-1, 9), true),
      n("u-emp", "ASSIGN", "Dell P2422H assigned to you", "Please confirm and sign the handover", "#/handover/ga16", d(0, 9, 40)),
      n("u-emp", "MAINT", "Your laptop's repair started", "Lenovo Service Centre, Guindy · back in about 5 days", "#/my-requests", d(-1, 16, 15)),
      n("u-admin", "USER", "New employee without a login", "Divya Natarajan has no user account yet", "#/admin/users", d(-1, 12))
    ];
    S.seq = { "AST-LAP": 16, "AST-MON": 5, "AST-DES": 2, "AST-MOB": 3, "AST-TAB": 1, "AST-KEY": 1, "AST-MOU": 1, "AST-HEA": 2, "AST-PRN": 1, "AST-RTR": 1, "AST-PRJ": 1, REQ: 41, TRF: 10, ISS: 36, MNT: 16, RET: 14, EMP: 14 };
    S.history.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    return S;
  }

  function n(userId, type, title, text, link, at, read) { return { id: "n" + Math.random().toString(36).slice(2, 9), userId: userId, type: type, title: title, text: text, link: link, at: at, read: !!read }; }
  function empName(S, id) { var e = S.employees.filter(function (x) { return x.id === id; })[0]; return e ? e.name : "—"; }
  function hist(S, assetId, at, event, text, by) { S.history.push({ id: "h" + S.history.length, assetId: assetId, at: at, event: event, text: text, by: by }); }
  function setExpected(S, assetId, iso) { S.assignments.forEach(function (g) { if (g.assetId === assetId && g.active) g.expected = iso; }); }
  function byTag() { return {}; }

  window.ATSeed = seed;
})();
