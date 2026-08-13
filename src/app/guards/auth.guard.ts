import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SecurityHelperService } from '../services/security-helper.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private securityService: SecurityHelperService, private router: Router) {}

  canActivate(): boolean {
    if (this.securityService.checkIsLoggedIn()) {
      return true;
    }
    this.router.navigate(['/home']);
    return false;
  }
}
