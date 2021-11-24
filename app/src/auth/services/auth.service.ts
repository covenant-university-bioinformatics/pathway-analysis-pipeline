import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../models/user.model';
import { NewUserDto } from '@cubrepgwas/pgwascommon';
import { UserUpdatedDto } from '@cubrepgwas/pgwascommon';
import { UserDeletedDto } from '@cubrepgwas/pgwascommon';

@Injectable()
export class AuthService {
  constructor() {}

  async register(newUserDto: NewUserDto): Promise<{ success: boolean }> {
    const session = await User.startSession();
    session.startTransaction();
    try {
      const opts = { session };

      const user = await User.build(newUserDto);

      await user.save(opts);

      await session.commitTransaction();
      return {
        success: true,
      };
    } catch (e) {
      console.log(e);
      if (e.code === 11000) {
        return { success: false };
      }
      await session.abortTransaction();
      // throw new HttpException(e.message, 400);
      return { success: false };
    } finally {
      session.endSession();
    }
  }

  async findAll() {
    return User.find();
  }

  async findOne(id: string) {
    const user = await User.findOne({ _id: id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(userUpdatedDto: UserUpdatedDto) {
    const oldUser = await User.findOne({
      username: userUpdatedDto.oldUsername,
    });

    if (userUpdatedDto.username) {
      oldUser.username = userUpdatedDto.username;
    }

    if (userUpdatedDto.email) {
      oldUser.email = userUpdatedDto.email;
    }

    if (userUpdatedDto.emailConfirmed) {
      oldUser.emailConfirmed = userUpdatedDto.emailConfirmed;
    }

    try {
      await oldUser.save();
      return { success: true };
    } catch (e) {
      console.log('Error: ', e);
      return { success: false };
    }
  }

  async emailConfirmChange(emailConfirmChange: {
    username: string;
    email: string;
    emailConfirmed: boolean;
  }) {
    const user = await User.findOne({
      username: emailConfirmChange.username,
    });

    user.emailConfirmed = emailConfirmChange.emailConfirmed;

    try {
      await user.save();
      return { success: true };
    } catch (e) {
      console.log('Error: ', e);
      return { success: false };
    }
  }

  async remove(userDeleteDto: UserDeletedDto) {
    try {
      User.deleteOne({
        username: userDeleteDto.username,
        email: userDeleteDto.email,
      });
      return { success: true };
    } catch (e) {
      console.log(e);
      return { success: false };
    }
  }
}
