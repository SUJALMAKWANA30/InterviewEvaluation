import User from "../models/User.js";

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });
  if (!user)
    return res.status(401).json({ success: false, message: "Invalid credentials" });

  res.json({ success: true, user });
};
