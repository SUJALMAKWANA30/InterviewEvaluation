import Role from "../models/Role.js";
import User from "../models/User.js";

/**
 * Seed a default Super Admin role and user on first run.
 * Only creates if no Super Admin role/user exists.
 */
export async function seedSuperAdmin() {
  try {
    // Check if Super Admin role already exists
    let superAdminRole = await Role.findOne({ slug: "super-admin" });

    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "Super Admin",
        slug: "super-admin",
        level: 0,
        isSystem: true,
        permissions: [
          { module: "candidates", actions: ["view", "create", "edit", "delete", "export"] },
          { module: "exams", actions: ["view", "create", "edit", "delete"] },
          { module: "drives", actions: ["view", "create", "edit", "delete"] },
          { module: "rounds", actions: ["view", "edit"] },
          { module: "reports", actions: ["view", "export"] },
          { module: "users", actions: ["view", "create", "edit", "delete"] },
          { module: "settings", actions: ["view", "edit"] },
        ],
      });
      console.log("✅ Super Admin role created");
    }

    // Check if any super admin user exists
    const existingSuperAdmin = await User.findOne({ role: superAdminRole._id });

    if (!existingSuperAdmin) {
      // Create default roles
      const defaultRoles = [
        {
          name: "Admin",
          slug: "admin",
          level: 1,
          isSystem: true,
          permissions: [
            { module: "candidates", actions: ["view", "create", "edit", "delete", "export"] },
            { module: "exams", actions: ["view", "create", "edit", "delete"] },
            { module: "drives", actions: ["view", "create", "edit", "delete"] },
            { module: "rounds", actions: ["view", "edit"] },
            { module: "reports", actions: ["view", "export"] },
            { module: "users", actions: ["view", "create", "edit"] },
            { module: "settings", actions: ["view", "edit"] },
          ],
        },
        {
          name: "HR Manager",
          slug: "hr-manager",
          level: 2,
          isSystem: false,
          permissions: [
            { module: "candidates", actions: ["view", "edit", "export"] },
            { module: "exams", actions: ["view", "create", "edit"] },
            { module: "drives", actions: ["view"] },
            { module: "rounds", actions: ["view", "edit"] },
            { module: "reports", actions: ["view", "export"] },
          ],
        },
        {
          name: "Recruiter",
          slug: "recruiter",
          level: 3,
          isSystem: false,
          permissions: [
            { module: "candidates", actions: ["view", "edit"] },
            { module: "exams", actions: ["view"] },
            { module: "drives", actions: ["view"] },
            { module: "rounds", actions: ["view", "edit"] },
            { module: "reports", actions: ["view"] },
          ],
        },
        {
          name: "HR Executive",
          slug: "hr-executive",
          level: 4,
          isSystem: false,
          permissions: [
            { module: "candidates", actions: ["view"] },
            { module: "exams", actions: ["view"] },
            { module: "drives", actions: ["view"] },
            { module: "rounds", actions: ["view"] },
            { module: "reports", actions: ["view"] },
          ],
        },
      ];

      for (const roleDef of defaultRoles) {
        const exists = await Role.findOne({ slug: roleDef.slug });
        if (!exists) {
          await Role.create(roleDef);
          console.log(`  ✅ Role "${roleDef.name}" created`);
        }
      }

      // Create default super admin user
      const defaultEmail = process.env.SUPER_ADMIN_EMAIL || "admin@tecnoprism.com";
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || "Admin@123";

      await User.create({
        name: "Super Admin",
        email: defaultEmail,
        password: defaultPassword,
        role: superAdminRole._id,
        isActive: true,
      });

      console.log(`✅ Super Admin user created: ${defaultEmail} / ${defaultPassword}`);
      console.log("⚠️  IMPORTANT: Change the super admin password after first login!");
    }
  } catch (error) {
    // Don't crash the app if seeding fails (e.g., duplicate key on restart)
    if (error.code !== 11000) {
      console.error("Seed error:", error.message);
    }
  }
}
