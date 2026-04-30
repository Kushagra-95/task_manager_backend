const Task = require("../models/Task");
const Project = require("../models/Project");

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const adminProjects = await Project.find({ admin: userId }).select("_id");
    const adminProjectIds = adminProjects.map((p) => p._id);

    const query =
      adminProjectIds.length > 0
        ? { $or: [{ project: { $in: adminProjectIds } }, { assignedTo: userId }] }
        : { assignedTo: userId };

    const tasks = await Task.find(query).select(
      "status dueDate assignedTo project"
    );

    const now = new Date();
    const total = tasks.length;

    const byStatus = tasks.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      { "To Do": 0, "In Progress": 0, Done: 0 }
    );

    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "Done"
    ).length;

    const tasksPerUser = tasks.reduce((acc, t) => {
      const key = t.assignedTo ? t.assignedTo.toString() : "unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total,
      byStatus,
      overdue,
      tasksPerUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

