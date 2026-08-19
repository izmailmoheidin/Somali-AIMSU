import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UrlHelperService } from '../services/url-helper-service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  isVerifying: boolean = true;
  isSuccess: boolean = false;
  isAlreadyVerified: boolean = false;
  isError: boolean = false;
  message: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient, private urlHelper: UrlHelperService) { }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (!token || !email) {
      this.isVerifying = false;
      this.isError = true;
      this.message = 'Invalid verification link. Please check your email for the correct link.';
      return;
    }

    const apiUrl = this.urlHelper.getBaseUrl() + 'User/VerifyEmail?token=' + encodeURIComponent(token) + '&email=' + encodeURIComponent(email);
    this.http.get<any>(apiUrl).subscribe(
      data => {
        this.isVerifying = false;
        if (data && data.success) {
          if (data.message === 'ALREADY_VERIFIED') {
            this.isAlreadyVerified = true;
            this.message = 'Your email has already been verified. You can log in to your account.';
          } else {
            this.isSuccess = true;
            this.message = 'Your email has been verified successfully! Your registration will now be reviewed by AIMS management for approval.';
          }
        } else {
          this.isError = true;
          this.message = data?.message || 'Verification failed. Please try again or contact support.';
        }
      },
      error => {
        this.isVerifying = false;
        this.isError = true;
        this.message = 'Verification failed. The link may be invalid. Please try again or contact support.';
      }
    );
  }

  goToLogin() {
    this.router.navigateByUrl('login');
  }
}
