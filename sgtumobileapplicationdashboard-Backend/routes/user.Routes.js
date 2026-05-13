const express = require("express");
const router = express.Router();
const {
  addUser, getAllUsers, updateUser, deleteUser
} = require("../controllers/user.controller");
const { checkPermission } = require("../middlewares/auth");

router.get("/",checkPermission("User Management","view"), getAllUsers);
router.post("/",checkPermission("User Management","write"), addUser); 
router.put("/:id",checkPermission("User Management","update"), updateUser)
router.delete("/:id",checkPermission("User Management","delete"), deleteUser)

module.exports = router;