import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { OrganizationService } from '../services/organization-service';
import { StoreService } from '../services/store-service';
import { SecurityHelperService } from '../services/security-helper.service';
import { Settings } from '../config/settings';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { ReportService } from '../services/report.service';
import { CurrencyService } from '../services/currency.service';
import { LocationService } from '../services/location.service';
import { FinancialYearService } from '../services/financial-year.service';
import { SectorTypeService } from '../services/sector-types.service';
import { faBuilding, faMoneyCheck, faTasks, faCalendarCheck, faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import 'leaflet';

@Component({
  selector: 'app-my-organization',
  templateUrl: './my-organization.component.html',
  styleUrls: ['./my-organization.component.css']
})
export class MyOrganizationComponent implements OnInit, AfterViewInit, OnDestroy {
  faBuilding: any = faBuilding;
  faMoneyCheck: any = faMoneyCheck;
  faTasks: any = faTasks;
  faCalendarCheck: any = faCalendarCheck;
  faEdit: any = faEdit;
  faPlus: any = faPlus;

  organizationId: string = null;
  organizationName: string = null;
  organizationType: string = null;
  projectsList: any = [];
  isLoading: boolean = false;
  pagingSize: number = Settings.rowsPerPage;
  defaultCurrency: string = 'USD';
  defaultCurrencyCode: string = null;
  permissions: any = {};
  currentTab: string = 'projects';

  totalProjects: number = 0;
  totalFunding: number = 0;
  totalPlannedDisbursements: number = 0;
  totalActualDisbursements: number = 0;
  currentYearLabel: string = null;

  // Dashboard state
  isDashboardLoading: boolean = false;
  isSectorChartLoading: boolean = true;
  isDonorChartLoading: boolean = true;
  isTrendChartLoading: boolean = true;
  isBudgetChartLoading: boolean = true;
  isMapLoading: boolean = true;
  isRegionChartLoading: boolean = true;
  yearsList: any = [];
  cachedLocations: any = [];
  mapLegend: any = [];

  sectorFromYear: number = 0;
  sectorToYear: number = 0;
  sectorTypesList: any = [];
  selectedSectorTypeId: number = 0;
  donorFromYear: number = 0;
  donorToYear: number = 0;
  trendFromYear: number = 0;
  trendToYear: number = 0;
  regionFromYear: number = 0;
  regionToYear: number = 0;
  budgetFromYear: number = 0;
  budgetToYear: number = 0;

  chartColors: any = ['#0b2545', '#2f6bb3', '#4189dd', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#6b7280'];
  regionColors: any = {
    'FGS': '#0b2545', 'BRA': '#4189dd', 'Galmudug': '#16a34a', 'Hirshabelle': '#ea580c',
    'Jubaland': '#7c3aed', 'Puntland': '#0891b2', 'South West': '#db2777', 'Somaliland': '#ca8a04', 'North East': '#dc2626'
  };
  regionCoords: any = {
    'FGS': [2.5, 45.8], 'BRA': [2.07, 45.3], 'Galmudug': [5.5, 47.0], 'Hirshabelle': [3.8, 46.2],
    'Jubaland': [0.5, 42.2], 'Puntland': [8.3, 49.0], 'South West': [2.8, 43.5], 'Somaliland': [9.5, 44.5], 'North East': [8.8, 46.5]
  };

  sectorChartType: any = 'doughnut';
  sectorChartData: any = { labels: [], datasets: [] };
  sectorChartOptions: any = {
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.label + ': ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.abbreviateAmount(ctx.parsed) } } }
  };

  donorChartType: any = 'bar';
  donorChartData: any = { labels: [], datasets: [] };
  donorChartOptions: any = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.abbreviateAmount(ctx.parsed.x) } } },
    scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: any) => this.abbreviateAmount(v) } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
  };

  trendChartType: any = 'line';
  trendChartData: any = { labels: [], datasets: [] };
  trendChartOptions: any = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.abbreviateAmount(ctx.parsed.y) } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: any) => this.abbreviateAmount(v) } } }
  };

  regionChartType: any = 'bar';
  regionChartData: any = { labels: [], datasets: [] };
  regionChartOptions: any = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.abbreviateAmount(ctx.parsed.x) } } },
    scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: any) => this.abbreviateAmount(v) } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
  };

  budgetChartType: any = 'bar';
  budgetChartData: any = { labels: [], datasets: [] };
  budgetChartOptions: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.dataset.label + ': ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.abbreviateAmount(ctx.parsed.y) } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: any) => this.abbreviateAmount(v) } } }
  };

  @ViewChild('orgMap') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('stateMap') stateMapContainer!: ElementRef<HTMLDivElement>;
  map: any = null;
  stateMap: any = null;

  // By State tab
  stateBreakdownData: any[] = [];
  stateMapLegend: any[] = [];
  isStateMapLoading: boolean = true;
  isStateChartLoading: boolean = true;
  selectedStateFilter: string = null;
  allProjectsList: any[] = [];
  stateSortField: string = 'projects';
  stateSortAsc: boolean = false;

  stateCountChartType: any = 'bar';
  stateCountChartData: any = { labels: [], datasets: [] };
  stateCountChartOptions: any = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.parsed.x + ' projects' } } },
    scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
  };


  @BlockUI() blockUI: NgBlockUI;

  constructor(
    private organizationService: OrganizationService,
    private storeService: StoreService,
    private securityService: SecurityHelperService,
    private router: Router,
    private reportService: ReportService,
    private currencyService: CurrencyService,
    private locationService: LocationService,
    private financialYearService: FinancialYearService,
    private sectorTypeService: SectorTypeService
  ) { }

  ngOnInit() {
    if (!this.securityService.checkIsLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.storeService.newReportItem(Settings.dropDownMenus.myOrganization);
    this.permissions = this.securityService.getUserPermissions();

    this.organizationId = this.securityService.getUserOrganizationId();
    this.organizationName = this.securityService.getUserOrganization();

    if (!this.organizationId || this.organizationId === 'null') {
      this.router.navigate(['/home']);
      return;
    }

    this.loadOrganizationDetails();
    this.loadOrganizationProjects();
    this.getDefaultCurrency();
    this.getFinancialYears();
    this.getSectorTypesList();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  // ===== By State tab =====
  loadStateBreakdown() {
    this.isStateMapLoading = true;
    this.isStateChartLoading = true;
    if (this.cachedLocations.length === 0) {
      this.locationService.getLocationsList().subscribe(
        locations => {
          this.cachedLocations = locations ? locations : [];
          this.fetchStateReport();
        },
        error => {
          console.error('State locations error:', error);
          this.isStateMapLoading = false;
          this.isStateChartLoading = false;
        }
      );
    } else {
      this.fetchStateReport();
    }
  }

  fetchStateReport() {
    this.reportService.getLocationWiseProjectsReport(this.getOrgSearchModel(0, 0)).subscribe(
      data => {
        var locationProjects = (data && data.locationProjectsList) ? data.locationProjectsList : [];
        this.buildStateBreakdown(locationProjects);
        this.isStateMapLoading = false;
        this.isStateChartLoading = false;
        setTimeout(() => this.initStateMap(), 100);
      },
      error => {
        console.error('State report error:', error);
        this.isStateMapLoading = false;
        this.isStateChartLoading = false;
      }
    );
  }

  rollUpToRegions(locationProjects: any, locMap: any, stateIds: number[]): any[] {
    var grouped: any = {};
    var order: number[] = [];

    locationProjects.forEach((lp: any) => {
      var locId = lp.locationId || 0;
      var loc = locMap[locId];
      if (!loc) return;

      var targetId: number;
      if (loc.parentLocationId == null) {
        targetId = locId;
      } else {
        var current = loc;
        while (current && current.parentLocationId && stateIds.indexOf(current.parentLocationId) === -1) {
          current = locMap[current.parentLocationId];
        }
        targetId = current ? (current.parentLocationId || current.id) : locId;
        if (current && current.parentLocationId) {
          targetId = current.parentLocationId;
        } else {
          targetId = current ? current.id : locId;
        }
      }

      if (!grouped[targetId]) {
        var targetLoc = locMap[targetId];
        grouped[targetId] = {
          locationId: targetId,
          locationName: targetLoc ? targetLoc.location : 'Unknown',
          totalFunding: 0,
          projects: []
        };
        order.push(targetId);
      }
      grouped[targetId].totalFunding += lp.totalFunding || 0;
      if (lp.projects) {
        grouped[targetId].projects = grouped[targetId].projects.concat(lp.projects);
      }
    });

    return order.map(id => grouped[id]);
  }

  buildStateBreakdown(locationProjects: any) {
    var locMap: any = {};
    this.cachedLocations.forEach((l: any) => { locMap[l.id] = l; });
    var stateIds = this.cachedLocations
      .filter((l: any) => l.parentLocationId == null && !l.isUnAttributed)
      .map((l: any) => l.id);
    var rolledUp = this.rollUpToRegions(locationProjects, locMap, stateIds);

    var breakdown: any[] = [];
    this.cachedLocations
      .filter((loc: any) => loc.parentLocationId == null && !loc.isUnAttributed)
      .forEach((loc: any) => {
        var report = rolledUp.filter((lp: any) => lp.locationId == loc.id);
        var projectCount = (report.length > 0 && report[0].projects) ? report[0].projects.length : 0;
        var totalFunding = (report.length > 0) ? report[0].totalFunding : 0;
        breakdown.push({
          locationName: loc.location,
          locationId: loc.id,
          projectCount: projectCount,
          totalFunding: totalFunding,
          projects: (report.length > 0 && report[0].projects) ? report[0].projects : []
        });
      });
    this.stateBreakdownData = breakdown;
    this.setupStateCountChart();
  }

  get sortedStateBreakdown(): any[] {
    var data = [...this.stateBreakdownData];
    var field = this.stateSortField;
    var asc = this.stateSortAsc;
    data.sort((a: any, b: any) => {
      var valA: any, valB: any;
      if (field === 'name') { valA = a.locationName; valB = b.locationName; }
      else if (field === 'projects') { valA = a.projectCount; valB = b.projectCount; }
      else { valA = a.totalFunding; valB = b.totalFunding; }
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
    return data;
  }

  sortStateBy(field: string) {
    if (this.stateSortField === field) {
      this.stateSortAsc = !this.stateSortAsc;
    } else {
      this.stateSortField = field;
      this.stateSortAsc = (field === 'name');
    }
  }

  setupStateCountChart() {
    var sorted = [...this.stateBreakdownData].sort((a: any, b: any) => b.projectCount - a.projectCount);
    this.stateCountChartData = {
      labels: sorted.map((s: any) => this.shortenLabel(s.locationName, 20)),
      datasets: [{
        data: sorted.map((s: any) => s.projectCount),
        backgroundColor: sorted.map((s: any) => this.regionColors[s.locationName] || '#4189dd'),
        borderRadius: 4,
        barThickness: 18
      }]
    };
  }

  initStateMap() {
    const L = (window as any).L;
    if (this.stateMap || !this.stateMapContainer) return;
    this.stateMap = L.map(this.stateMapContainer.nativeElement, { scrollWheelZoom: false }).setView([5.1521, 46.1996], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: 4, crossOrigin: 'anonymous',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.stateMap);
    this.addStateMarkers();
  }

  addStateMarkers() {
    const L = (window as any).L;
    if (!this.stateMap) return;
    var markerBounds: any = [];
    var legendEntries: any = [];
    this.cachedLocations
      .filter((loc: any) => loc.parentLocationId == null && !loc.isUnAttributed)
      .map((loc: any) => {
        var lat = parseFloat(loc.latitude);
        var lng = parseFloat(loc.longitude);
        if ((!lat && !lng) && this.regionCoords[loc.location]) {
          lat = this.regionCoords[loc.location][0];
          lng = this.regionCoords[loc.location][1];
        }
        var stateData = this.stateBreakdownData.filter((s: any) => s.locationName == loc.location);
        var projectsCount = (stateData.length > 0) ? stateData[0].projectCount : 0;
        var totalFunding = (stateData.length > 0) ? stateData[0].totalFunding : 0;
        return { loc, lat, lng, projectsCount, totalFunding };
      })
      .filter((item: any) => item.lat || item.lng)
      .sort((a: any, b: any) => b.projectsCount - a.projectsCount)
      .forEach((item: any) => {
        var { loc, lat, lng, projectsCount, totalFunding } = item;
        var radius = 10 + Math.min(18, Math.sqrt(projectsCount));
        var regionColor = this.regionColors[loc.location] || '#4189dd';
        var marker = L.circleMarker([lat, lng], { radius, color: '#ffffff', weight: 2, fillColor: regionColor, fillOpacity: 0.85 }).addTo(this.stateMap);
        marker.bindTooltip(loc.location, { direction: 'top' });
        marker.bindPopup('<div style="min-width:170px"><b>' + loc.location + '</b><br/>Projects: ' + projectsCount + '<br/>Total funding: ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.formatNumberWithCommas(Math.round(totalFunding)) + '</div>');
        markerBounds.push([lat, lng]);
        if (legendEntries.findIndex((e: any) => e.label === loc.location) === -1) {
          legendEntries.push({ label: loc.location, color: regionColor });
        }
      });
    if (markerBounds.length > 0) this.stateMap.fitBounds(markerBounds, { padding: [40, 40] });
    setTimeout(() => { if (this.stateMap) this.stateMap.invalidateSize(); }, 200);
    this.stateMapLegend = legendEntries;
  }

  filterByState(stateName: string) {
    var stateData = this.stateBreakdownData.filter((s: any) => s.locationName == stateName);
    if (stateData.length === 0) return;
    var stateProjectIds = stateData[0].projects.map((p: any) => p.projectId || p.ProjectId || p.id || p.Id);
    this.selectedStateFilter = stateName;
    this.projectsList = this.allProjectsList.filter((p: any) => stateProjectIds.includes(p.id));
    this.computeSummaryStats();
    this.switchTab('projects');
  }

  clearStateFilter() {
    this.selectedStateFilter = null;
    this.projectsList = [...this.allProjectsList];
    this.computeSummaryStats();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.stateMap) {
      this.stateMap.remove();
    }
  }

  loadOrganizationDetails() {
    this.organizationService.getOrganization(this.organizationId).subscribe(
      data => {
        if (data) {
          this.organizationName = data.organizationName || this.organizationName;
          this.organizationType = data.organizationType;
        }
      },
      error => {
        console.error('Error loading organization details:', error);
      }
    );
  }

  loadOrganizationProjects() {
    this.isLoading = true;
    this.blockUI.start('Loading organization projects...');
    this.organizationService.getOrganizationProjects(this.organizationId).subscribe(
      data => {
        if (data) {
          this.projectsList = data;
          this.allProjectsList = [...data];
          this.computeSummaryStats();
        }
        this.isLoading = false;
        this.blockUI.stop();
      },
      error => {
        console.error('Error loading organization projects:', error);
        this.isLoading = false;
        this.blockUI.stop();
      }
    );
  }

  computeSummaryStats() {
    this.totalProjects = this.projectsList.length;
    this.totalFunding = this.projectsList.reduce((sum, p) => sum + (p.projectValueInDefaultCurrency || 0), 0);
    this.totalPlannedDisbursements = this.projectsList.reduce((sum, p) => sum + (p.currentYearPlannedDisbursements || 0), 0);
    this.totalActualDisbursements = this.projectsList.reduce((sum, p) => sum + (p.currentYearActualDisbursements || 0), 0);
    if (this.projectsList.length > 0 && this.projectsList[0].currentYearLabel) {
      this.currentYearLabel = this.projectsList[0].currentYearLabel;
    }
  }

  formatNumber(value: number) {
    if (!value) {
      return value;
    }
    if (!isNaN(value) && value > 0) {
      return this.storeService.getNumberWithCommas(value);
    }
    return value;
  }

  formatNumberWithCommas(value: number) {
    return this.storeService.getNumberWithCommas(value);
  }

  viewProject(id: number) {
    this.router.navigate(['/view-project', id]);
  }

  // ===== Tab switching =====
  switchTab(tab: string) {
    this.currentTab = tab;
    if (tab === 'dashboard') {
      if (!this.map) {
        setTimeout(() => {
          this.initMap();
          if (this.sectorChartData.labels.length === 0) {
            this.loadDashboardData();
          } else if (this.cachedLocations.length > 0) {
            this.reloadMapData();
          }
        }, 100);
      } else {
        setTimeout(() => this.map.invalidateSize(), 200);
        if (this.sectorChartData.labels.length === 0) {
          this.loadDashboardData();
        }
      }
    }
    if (tab === 'bystate') {
      if (!this.stateMap) {
        setTimeout(() => {
          this.initStateMap();
        }, 100);
      } else {
        setTimeout(() => this.stateMap.invalidateSize(), 200);
      }
      if (this.stateBreakdownData.length === 0) {
        this.loadStateBreakdown();
      }
    }
  }

  // ===== Dashboard =====
  getDefaultCurrency() {
    this.currencyService.getDefaultCurrency().subscribe(
      data => {
        if (data) {
          this.defaultCurrency = data.currencyName;
          this.defaultCurrencyCode = data.currency;
        }
      }
    );
  }

  getFinancialYears() {
    this.financialYearService.getYearsList().subscribe(
      data => {
        if (data && data.length) {
          this.yearsList = data.sort((a: any, b: any) => a.financialYear - b.financialYear);
        }
      }
    );
  }

  getOrgSearchModel(fromYear: number = 0, toYear: number = 0) {
    return {
      projectIds: [],
      startingYear: fromYear || 0,
      endingYear: toYear || 0,
      organizationIds: [parseInt(this.organizationId)],
      sectorIds: [], locationIds: [], subLocationIds: [], description: '',
      lowerRange: 0, upperRange: 0,
      sectorTypeId: this.selectedSectorTypeId || 0
    };
  }

  loadDashboardData() {
    this.isDashboardLoading = true;
    this.getSectorChart();
    this.getDonorChart();
    this.getYearlyTrendChart();
    this.loadMapData();
  }

  getSectorChart() {
    this.isSectorChartLoading = true;
    this.reportService.getSectorWiseProjectsReport(this.getOrgSearchModel(this.sectorFromYear, this.sectorToYear)).subscribe(
      data => {
        var sectorsList = (data && data.sectorProjectsList) ? data.sectorProjectsList : [];
        sectorsList = sectorsList.filter((s: any) => s.sectorName != 'Unattributed Sector' || s.totalFunding > 0);
        this.sectorChartData = {
          labels: sectorsList.map((s: any) => this.shortenLabel(s.sectorName, 40)),
          datasets: [{ data: sectorsList.map((s: any) => Math.round(s.totalFunding)), backgroundColor: this.chartColors, borderColor: '#ffffff', borderWidth: 2 }]
        };
        this.isSectorChartLoading = false;
      }
    );
  }

  getDonorChart() {
    this.isDonorChartLoading = true;
    this.reportService.getOrganizationWiseProjectsReport(this.getOrgSearchModel(this.donorFromYear, this.donorToYear)).subscribe(
      data => {
        var orgsList = (data && data.organizationProjectsList) ? data.organizationProjectsList : [];
        var topDonors = orgsList.sort((a: any, b: any) => b.totalFunding - a.totalFunding).slice(0, 10);
        this.donorChartData = {
          labels: topDonors.map((o: any) => this.shortenLabel(o.organizationName, 28)),
          datasets: [{ data: topDonors.map((o: any) => Math.round(o.totalFunding)), backgroundColor: '#4189dd', hoverBackgroundColor: '#0b2545', borderRadius: 6, barThickness: 20 }]
        };
        this.isDonorChartLoading = false;
      }
    );
  }

  getYearlyTrendChart() {
    this.isTrendChartLoading = true;
    this.reportService.getYearlyProjectsReport(this.getOrgSearchModel(this.trendFromYear, this.trendToYear)).subscribe(
      data => {
        var yearlyList = (data && data.yearlyProjectsList) ? data.yearlyProjectsList : [];
        yearlyList = yearlyList.sort((a: any, b: any) => a.year - b.year);
        this.trendChartData = {
          labels: yearlyList.map((y: any) => y.year),
          datasets: [
            { label: 'Actual disbursements', data: yearlyList.map((y: any) => Math.round(y.totalActualDisbursements)), borderColor: '#4189dd', backgroundColor: 'rgba(65, 137, 221, 0.1)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#4189dd' },
            { label: 'Planned disbursements', data: yearlyList.map((y: any) => Math.round(y.totalPlannedDisbursements)), borderColor: '#ea580c', backgroundColor: 'rgba(234, 88, 12, 0.05)', borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#ea580c' }
          ]
        };
        this.isTrendChartLoading = false;
        // Compute budget summary from year-wise data (since GetBudgetSummaryReport doesn't support org filtering)
        this.computeBudgetFromYearly(yearlyList);
      }
    );
  }

  computeBudgetFromYearly(yearlyList: any) {
    var filtered = yearlyList;
    if (this.budgetFromYear) filtered = filtered.filter((y: any) => y.year >= this.budgetFromYear);
    if (this.budgetToYear) filtered = filtered.filter((y: any) => y.year <= this.budgetToYear);
    this.budgetChartData = {
      labels: filtered.map((y: any) => y.year),
      datasets: [
        { label: 'Actual', data: filtered.map((y: any) => Math.round(y.totalActualDisbursements)), backgroundColor: '#16a34a', borderRadius: 4, barThickness: 16 },
        { label: 'Planned', data: filtered.map((y: any) => Math.round(y.totalPlannedDisbursements)), backgroundColor: '#0b2545', borderRadius: 4, barThickness: 16 }
      ]
    };
    this.isBudgetChartLoading = false;
  }

  onBudgetYearFilter() {
    this.isBudgetChartLoading = true;
    setTimeout(() => {
      // Re-trigger trend chart which also computes budget
      this.getYearlyTrendChart();
    }, 50);
  }

  onSectorYearFilter() { this.getSectorChart(); }
  onDonorYearFilter() { this.getDonorChart(); }
  onTrendYearFilter() { this.getYearlyTrendChart(); }
  onRegionYearFilter() { this.isRegionChartLoading = true; this.reloadMapData(); }

  getSectorTypesList() {
    this.sectorTypeService.getSectorTypesList().subscribe(
      data => {
        if (data) {
          this.sectorTypesList = data;
          var defaultType = data.filter((t: any) => t.isPrimary == true);
          if (defaultType.length > 0) {
            this.selectedSectorTypeId = defaultType[0].id;
          }
        }
      }
    );
  }

  onSectorTypeChange() { this.getSectorChart(); }

  clearSectorYearFilter() { this.sectorFromYear = 0; this.sectorToYear = 0; this.onSectorYearFilter(); }
  clearDonorYearFilter() { this.donorFromYear = 0; this.donorToYear = 0; this.onDonorYearFilter(); }
  clearTrendYearFilter() { this.trendFromYear = 0; this.trendToYear = 0; this.onTrendYearFilter(); }
  clearRegionYearFilter() { this.regionFromYear = 0; this.regionToYear = 0; this.onRegionYearFilter(); }
  clearBudgetYearFilter() { this.budgetFromYear = 0; this.budgetToYear = 0; this.onBudgetYearFilter(); }

  shortenLabel(label: string, maxLength: number) {
    if (!label) return '';
    return (label.length > maxLength) ? (label.substring(0, maxLength) + '\u2026') : label;
  }

  abbreviateAmount(value: any) {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value;
  }

  // ===== Map =====
  initMap() {
    const L = (window as any).L;
    if (this.map || !this.mapContainer) return;
    this.map = L.map(this.mapContainer.nativeElement, { scrollWheelZoom: false }).setView([5.1521, 46.1996], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: 4, crossOrigin: 'anonymous',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  loadMapData() {
    this.isMapLoading = true;
    this.locationService.getLocationsList().subscribe(
      locations => {
        this.cachedLocations = locations ? locations : [];
        this.loadLocationReport();
      },
      error => {
        console.error('Map data error:', error);
        this.isMapLoading = false;
        this.isRegionChartLoading = false;
      }
    );
  }

  loadLocationReport() {
    if (this.cachedLocations.length === 0) {
      this.isMapLoading = false;
      this.isRegionChartLoading = false;
      return;
    }
    var locMap: any = {};
    this.cachedLocations.forEach((l: any) => { locMap[l.id] = l; });
    var stateIds = this.cachedLocations
      .filter((l: any) => l.parentLocationId == null && !l.isUnAttributed)
      .map((l: any) => l.id);
    this.reportService.getLocationWiseProjectsReport(this.getOrgSearchModel(this.regionFromYear, this.regionToYear)).subscribe(
      data => {
        var locationProjects = (data && data.locationProjectsList) ? data.locationProjectsList : [];
        var rolledUp = this.rollUpToRegions(locationProjects, locMap, stateIds);
        this.addMarkers(this.cachedLocations, rolledUp, locMap);
        this.setupRegionChart(rolledUp, locMap);
        this.isMapLoading = false;
      },
      error => {
        console.error('Location report error:', error);
        this.isMapLoading = false;
        this.isRegionChartLoading = false;
      }
    );
  }

  reloadMapData() {
    if (!this.map) return;
    this.isMapLoading = true;
    this.map.eachLayer((layer: any) => {
      if (layer instanceof (window as any).L.CircleMarker) {
        this.map.removeLayer(layer);
      }
    });
    this.mapLegend = [];
    if (this.cachedLocations.length === 0) {
      this.loadMapData();
    } else {
      this.loadLocationReport();
    }
  }

  addMarkers(locationsList: any, rolledUpData: any, locMap: any) {
    const L = (window as any).L;
    if (!this.map) return;
    var markerBounds: any = [];
    var legendEntries: any = [];
    var sortedData = rolledUpData
      .filter((item: any) => item.projects && item.projects.length > 0)
      .map((item: any) => {
        var loc = locMap[item.locationId];
        if (!loc) return null;
        var lat = parseFloat(loc.latitude);
        var lng = parseFloat(loc.longitude);
        if ((!lat && !lng) && this.regionCoords[loc.location]) {
          lat = this.regionCoords[loc.location][0];
          lng = this.regionCoords[loc.location][1];
        }
        var projectsCount = item.projects.length;
        var totalFunding = item.totalFunding;
        return { loc, lat, lng, projectsCount, totalFunding };
      })
      .filter((item: any) => item && (item.lat || item.lng))
      .sort((a: any, b: any) => b.projectsCount - a.projectsCount);
    sortedData.forEach((item: any) => {
      var { loc, lat, lng, projectsCount, totalFunding } = item;
      var radius = 10 + Math.min(18, Math.sqrt(projectsCount));
      var regionColor = this.regionColors[loc.location] || '#4189dd';
      var marker = L.circleMarker([lat, lng], { radius, color: '#ffffff', weight: 2, fillColor: regionColor, fillOpacity: 0.85 }).addTo(this.map);
      marker.bindTooltip(loc.location, { direction: 'top' });
      marker.bindPopup('<div style="min-width:170px"><b>' + loc.location + '</b><br/>Projects: ' + projectsCount + '<br/>Total funding: ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.formatNumberWithCommas(Math.round(totalFunding)) + '</div>');
      markerBounds.push([lat, lng]);
      if (legendEntries.findIndex((e: any) => e.label === loc.location) === -1) {
        legendEntries.push({ label: loc.location, color: regionColor });
      }
    });
    if (markerBounds.length > 0) this.map.fitBounds(markerBounds, { padding: [40, 40] });
    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
    this.mapLegend = legendEntries;
  }

  setupRegionChart(rolledUpData: any, locMap: any) {
    var regions = rolledUpData
      .filter((r: any) => r.totalFunding > 0)
      .sort((a: any, b: any) => b.totalFunding - a.totalFunding);
    this.regionChartData = {
      labels: regions.map((r: any) => this.shortenLabel(r.locationName, 20)),
      datasets: [{ data: regions.map((r: any) => Math.round(r.totalFunding)), backgroundColor: regions.map((r: any) => { var loc = locMap[r.locationId]; return this.regionColors[r.locationName] || (loc ? this.regionColors[loc.location] || '#4189dd' : '#4189dd'); }), borderRadius: 4, barThickness: 18 }]
    };
    this.isRegionChartLoading = false;
  }

  canEditProject(): boolean {
    return this.permissions.canEditProject || this.permissions.canManage || this.securityService.checkIsLoggedIn();
  }

  addNewProject() {
    localStorage.setItem('active-project', '0');
    localStorage.setItem('return-to', 'my-organization');
    this.router.navigate(['/data-entry']);
  }

  editProject(projectId: number) {
    localStorage.setItem('active-project', projectId.toString());
    localStorage.setItem('return-to', 'my-organization');
    this.router.navigate(['/data-entry']);
  }
}
