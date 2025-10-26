import { Controller, Dependencies, Post } from '@nestjs/common';
import { LoginUseCase } from '../../application/users/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/users/use-cases/logout.use-case';

@Controller('auth')
@Dependencies(LoginUseCase, LogoutUseCase)
export class AuthController {
  constructor(loginUseCase, logoutUseCase) {
    this.loginUseCase = loginUseCase;
    this.logoutUseCase = logoutUseCase;
  }

  @Post('login')
  async login(req) {
    try {
      const { token, user } = await this.loginUseCase.execute({ correo: req?.body?.correo });
      return { token, user };
    } catch (e) {
      const status = e?.status || 500;
      const message = e?.message || 'Error';
      return { statusCode: status, message };
    }
  }

  @Post('logout')
  async logout(req) {
    try {
      const auth = req?.headers?.authorization;
      const token = (auth || '').replace(/^Bearer\s+/i, '');
      const result = await this.logoutUseCase.execute({ token });
      return result;
    } catch (e) {
      const status = e?.status || 500;
      const message = e?.message || 'Error';
      return { statusCode: status, message };
    }
  }
}

export default AuthController;