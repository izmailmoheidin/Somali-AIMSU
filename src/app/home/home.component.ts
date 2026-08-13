import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StoreService } from '../services/store-service';
import {Settings} from '../config/settings';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user-service';
import { OrganizationService } from '../services/organization-service';
import { ProjectService } from '../services/project.service';
import { CurrencyService } from '../services/currency.service';
import { HomePageService } from '../services/home-page.service';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { faBuilding, faMoneyCheck, faTasks, faUser } from '@fortawesome/free-solid-svg-icons';
import { DocumentLinkService } from '../services/document-link.service';
import { SponsorLogoService } from '../services/sponsor-logo.service';
import { UrlHelperService } from '../services/url-helper-service';
import { SecurityHelperService } from '../services/security-helper.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  faBuilding: any = faBuilding;
  faMoneyCheck: any = faMoneyCheck;
  faTasks: any = faTasks;
  faUser: any = faUser;
  infoMessage: string = null;
  showMessage: boolean = false;
  isProjectsLoading: boolean = true;
  isSponsorsLoading: boolean = true;
  isIntroLoading: boolean = true;
  isLinkLoading: boolean = true;
  usersCount: number = 0;
  projectsCount: number = 0;
  organizationsCount: number = 0;
  currentYearDisbursements: number = 0;
  defaultCurrency: string = null;
  defaultCurrencyCode: string = null;
  currentYear: number = 0;
  currentFinancialYear: string = 'FY...';
  model: any = { aimsTitle: null, introductionHeading: null, introductionText: null };
  latestProjects: any = [];
  links: any = [];
  sponsors: any = [];
  requestNo: number = 0;
  videoOneUrl!: SafeResourceUrl;
  videoTwoUrl!: SafeResourceUrl;
  permissions: any = {};
  stateLinks: any[] = [
    { id: 2, name: 'FGS', color: '#0b2545' },
    { id: 3, name: 'BRA', color: '#4189dd' },
    { id: 4, name: 'Galmudug', color: '#16a34a' },
    { id: 5, name: 'Hirshabelle', color: '#ea580c' },
    { id: 6, name: 'Jubaland', color: '#7c3aed' },
    { id: 7, name: 'Puntland', color: '#0891b2' },
    { id: 8, name: 'South West', color: '#db2777' },
    { id: 9, name: 'Somaliland', color: '#ca8a04' },
    { id: 14, name: 'North East', color: '#dc2626' }
  ];
  
  constructor(private storeService: StoreService, private route: ActivatedRoute,
    private userService: UserService, private organizationService: OrganizationService,
    private projectService: ProjectService, private currencyService: CurrencyService,
    private homePageService: HomePageService, private router: Router,
    private documentService: DocumentLinkService,
    private sponsorService: SponsorLogoService,
    private urlService: UrlHelperService,
    private sanitizer: DomSanitizer,
    private securityService: SecurityHelperService,
    private httpClient: HttpClient
    ) {
      this.videoOneUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/DYG0VayhKcs?si=2TW1SsKu1LSCd6Ym');
      this.videoTwoUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/H_n8DjUbCmk?si=VNmsK9nCbVNf4A-t');
     }

  ngOnInit() {
    this.storeService.newReportItem(Settings.dropDownMenus.home);
    this.permissions = this.securityService.getUserPermissions();
    this.storeService.currentInfoMessage.subscribe(message => this.infoMessage = message);
    if (this.infoMessage !== null && this.infoMessage !== '') {
      this.showMessage = true;
    }
    setTimeout(() => {
      this.storeService.newInfoMessage('');
      this.showMessage = false;
    }, Settings.displayMessageTime);

    this.getCurrentYearDisbursements();
    this.getHomePageSettings();
    this.getUsersCount();
    this.getProjectsCount();
    this.getOrganizationsCount();
    this.getDefaultCurrency();
    this.getLatestProjects();
    this.getDocumentLinks();
    this.getSponsors();
  }

  getDefaultCurrency() {
    this.currencyService.getDefaultCurrency().subscribe(
      data => {
        if (data) {
          this.defaultCurrency = data.currencyName;
        }
      }
    );
  }

  getUsersCount() {
    this.userService.getUsersCount().subscribe(
      data => {
        if (data) {
          this.usersCount = data;
        }
      }
    );
  }

  getProjectsCount() {
    this.projectService.getProjectsCount().subscribe(
      data => {
        if (data) {
          this.projectsCount = data;
        }
      }
    );
  }

  getOrganizationsCount() {
    this.organizationService.getOrganizationsCount().subscribe(
      data => {
        if (data) {
          this.organizationsCount = data;
        }
      }
    );
  }

  getCurrentYearDisbursements() {
    this.projectService.getCurrentYearsDisbursements().subscribe(
      data => {
        if (data) {
          this.currentYear = data.currentYear;
          this.currentFinancialYear = data.financialYear;
          this.currentYearDisbursements = Math.round(data.disbursements);
        }
      }
    );
  }

  getHomePageSettings() {
    this.homePageService.getHomePageSettings().subscribe(
      data => {
        if (data) {
          this.model = data;
        }
        this.isIntroLoading = false;
      }
    );
  }

  getLatestProjects() {
    this.projectService.getLatestProjects().subscribe(
      data => {
        if (data) {
          this.defaultCurrencyCode = (data.defaultCurrency) ? data.defaultCurrency : null;
          this.latestProjects = (data.projects) ? data.projects : [];
        }
        this.isProjectsLoading = false;
      }
    );
  }

  getDocumentLinks() {
    this.documentService.getDocumentLinks().subscribe(
      data => {
        if (data) {
          this.links = data;
        }
        this.isLinkLoading = false;
      }
    );
  }

  getSponsors() {
    var logosBaseUrl = this.urlService.getLogosUrl();
    this.sponsorService.getLogos().subscribe(
      data => {
        if (data) {
          this.sponsors = data.sponsorLogos; 
          this.sponsors.forEach((s) => {
            s.logoPath = logosBaseUrl + s.logoPath;
          });
        }
        this.isSponsorsLoading = false;
      }
    );
  }

  viewProjectDetail(id) {
    if (id) {
      this.router.navigateByUrl('view-project/' + id);
    }
  }

  formatNumberWithCommas(value: number) {
    return this.storeService.getNumberWithCommas(value);
  
  }
  openHangfireDashboard(): void {
    this.httpClient.post(
      this.urlService.getHangfireAuthenticateUrl(),
      {},
      {
        headers: new HttpHeaders({
          'Authorization': 'Bearer ' + localStorage.getItem("token")
        }),
        withCredentials: true
      }
    ).subscribe({
      next: () => {
        window.open(this.urlService.getHangfireDashboardUrl(), '_blank');
      },
      error: () => {
        alert('Unable to open Hangfire Dashboard.');
      }
    });
  }
}
