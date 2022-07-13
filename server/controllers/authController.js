import User from "../models/User.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnauthenticatedError } from "../errors/index.js";

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    throw new BadRequestError("please provide all values");

  //check if duplicate email
  const userAlreadyExists = await User.findOne({ email });
  if (userAlreadyExists) throw new BadRequestError("Email already in use");

  const user = await User.create({ name, email, password });

  const token = user.createJWT();

  user.password = undefined; //to not send back password
  res.status(StatusCodes.CREATED).json({
    user,
    token,
    location: user.location,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new BadRequestError("Please provide all values");

  const user = await User.findOne({ email }).select("+password"); //override User Schema password : "select:false"
  if (!user) throw new UnauthenticatedError("Invalid Credentials");

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) throw new UnauthenticatedError("Invalid Credentials");

  const token = user.createJWT();

  user.password = undefined; //to not send back password
  res.status(StatusCodes.OK).json({ user, token, location: user.location });
};
const updateUser = async (req, res) => {
  console.log(req.user);
  res.send("update user");
};

export { register, login, updateUser };
