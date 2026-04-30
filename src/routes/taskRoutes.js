const router = require("express").Router();
const protect = require("../middleware/authMiddleware");

const {
  createTask,
  updateTask,
  getTasks
} = require("../controllers/taskController");

router.post("/", protect, createTask);
router.put("/:id", protect, updateTask);
router.get("/", protect, getTasks);

module.exports = router;