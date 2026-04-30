const Project = require("../models/Project");
const User = require("../models/User");

const isAdmin = (project, userId) =>
  project.admin?.toString() === userId.toString();

const isMember = (project, userId) =>
  project.members?.some((m) => m.toString() === userId.toString());

exports.createProject = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      name,
      admin: req.user._id,
      members: [req.user._id]
    });

    const populated = await Project.findById(project._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

exports.addMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!isAdmin(project, req.user._id)) {
      return res.status(403).json({
        message: "Only admin can add members"
      });
    }

    const { userId, email } = req.body;

    let userToAdd = null;
    if (userId) {
      userToAdd = await User.findById(userId);
    } else if (email) {
      userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    } else {
      return res.status(400).json({ message: "userId or email is required" });
    }

    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    if (isMember(project, userToAdd._id)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    project.members.push(userToAdd._id);

    await project.save();

    const populated = await Project.findById(project._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.json(populated);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

exports.getProjects = async (req, res) => {
  const projects = await Project.find({ members: req.user._id })
    .populate("admin", "-password")
    .populate("members", "-password");

  res.json(projects);
};

exports.getProjectById = async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("admin", "-password")
    .populate("members", "-password");

  if (!project) return res.status(404).json({ message: "Project not found" });
  if (!isMember(project, req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  res.json(project);
};

exports.removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!isAdmin(project, req.user._id)) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    const memberId = req.params.userId;
    if (!memberId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (project.admin?.toString() === memberId.toString()) {
      return res.status(400).json({ message: "Cannot remove the project admin" });
    }

    project.members = project.members.filter(
      (m) => m.toString() !== memberId.toString()
    );

    await project.save();

    const populated = await Project.findById(project._id)
      .populate("admin", "-password")
      .populate("members", "-password");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};