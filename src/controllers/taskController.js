const Task = require("../models/Task");
const Project = require("../models/Project");

const isAdmin = (project, userId) =>
  project.admin?.toString() === userId.toString();

const isMember = (project, userId) =>
  project.members?.some((m) => m.toString() === userId.toString());

exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description = "",
      dueDate,
      priority,
      status,
      assignedTo,
      project: projectId
    } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ message: "title and project are required" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!isAdmin(project, req.user._id)) {
      return res.status(403).json({ message: "Only project admin can create tasks" });
    }

    if (assignedTo && !isMember(project, assignedTo)) {
      return res.status(400).json({ message: "Assignee must be a project member" });
    }

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      status,
      assignedTo: assignedTo || null,
      project: projectId
    });

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "-password")
      .populate("project");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

exports.updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: "Project not found" });

  const userId = req.user._id.toString();
  const admin = isAdmin(project, userId);
  const assignee = task.assignedTo?.toString() === userId;

  if (!admin && !assignee) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Members can only update their own task status
  if (!admin) {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    task.status = status;
  } else {
    const {
      title,
      description,
      dueDate,
      priority,
      status,
      assignedTo
    } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;

    if (assignedTo !== undefined) {
      if (assignedTo && !isMember(project, assignedTo)) {
        return res.status(400).json({ message: "Assignee must be a project member" });
      }
      task.assignedTo = assignedTo || null;
    }
  }

  await task.save();

  const populated = await Task.findById(task._id)
    .populate("assignedTo", "-password")
    .populate("project");

  res.json(populated);
};

exports.getTasks = async (req, res) => {
  const { projectId } = req.query;

  if (projectId) {
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!isMember(project, req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const query = isAdmin(project, req.user._id)
      ? { project: projectId }
      : { project: projectId, assignedTo: req.user._id };

    const tasks = await Task.find(query)
      .populate("assignedTo", "-password")
      .populate("project");

    return res.json(tasks);
  }

  // No project filter:
  // - Admin: tasks in projects they admin + tasks assigned to them
  // - Member: tasks assigned to them only
  const adminProjects = await Project.find({ admin: req.user._id }).select("_id");
  const adminProjectIds = adminProjects.map((p) => p._id);

  const query =
    adminProjectIds.length > 0
      ? { $or: [{ project: { $in: adminProjectIds } }, { assignedTo: req.user._id }] }
      : { assignedTo: req.user._id };

  const tasks = await Task.find(query)
    .populate("assignedTo", "-password")
    .populate("project");

  res.json(tasks);
};