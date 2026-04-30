const router = require("express").Router();
const protect = require("../middleware/authMiddleware");

const {
  createProject,
  addMember,
  getProjects,
  getProjectById,
  removeMember
} = require("../controllers/projectController");

router.post("/", protect, createProject);
router.get("/", protect, getProjects);
router.get("/:id", protect, getProjectById);
router.post("/:id/members", protect, addMember);
router.delete("/:id/members/:userId", protect, removeMember);

module.exports = router;