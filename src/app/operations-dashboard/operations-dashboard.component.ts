import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { StoreService } from '../services/store-service';
import { Settings } from '../config/settings';
import { UserService } from '../services/user-service';
import { OrganizationService } from '../services/organization-service';
import { ProjectService } from '../services/project.service';
import { CurrencyService } from '../services/currency.service';
import { LocationService } from '../services/location.service';
import { ReportService } from '../services/report.service';
import { FinancialYearService } from '../services/financial-year.service';
import { SectorTypeService } from '../services/sector-types.service';
import { SectorService } from '../services/sector.service';
import { Router } from '@angular/router';
import { faBuilding, faMoneyCheck, faTasks, faUser } from '@fortawesome/free-solid-svg-icons';
import 'leaflet';

@Component({
  selector: 'app-operations-dashboard',
  templateUrl: './operations-dashboard.component.html',
  styleUrls: ['./operations-dashboard.component.css']
})
export class OperationsDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  faBuilding: any = faBuilding;
  faMoneyCheck: any = faMoneyCheck;
  faTasks: any = faTasks;
  faUser: any = faUser;

  usersCount: number = 0;
  projectsCount: number = 0;
  organizationsCount: number = 0;
  currentYearDisbursements: number = 0;
  defaultCurrency: string = null;
  currentYear: number = 0;
  currentFinancialYear: string = 'FY...';

  isFeedLoading: boolean = true;
  isMapLoading: boolean = true;
  isSectorChartLoading: boolean = true;
  isDonorChartLoading: boolean = true;
  isTrendChartLoading: boolean = true;
  isRegionChartLoading: boolean = true;
  isBudgetChartLoading: boolean = true;
  latestProjects: any = [];
  defaultCurrencyCode: string = null;
  mapLegend: any[] = [];
  budgetRawData: any[] = [];
  cachedLocations: any[] = [];

  yearsList: any = [];

  sectorFromYear: number = 0;
  sectorToYear: number = 0;
  sectorTypesList: any = [];
  selectedSectorTypeId: number = 0;
  allSectorsList: any = [];
  sectorsList: any = [];
  selectedSectorId: number = 0;
  donorFromYear: number = 0;
  donorToYear: number = 0;
  trendFromYear: number = 0;
  trendToYear: number = 0;
  regionFromYear: number = 0;
  regionToYear: number = 0;
  budgetFromYear: number = 0;
  budgetToYear: number = 0;

  regionColors: any = {
    'FGS': '#0b2545',
    'BRA': '#4189dd',
    'Galmudug': '#16a34a',
    'Hirshabelle': '#ea580c',
    'Jubaland': '#7c3aed',
    'Puntland': '#0891b2',
    'South West': '#db2777',
    'Somaliland': '#ca8a04',
    'North East': '#dc2626'
  };

  chartColors: any = ['#0b2545', '#2f6bb3', '#4189dd', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#6b7280'];

  sectorChartType: any = 'doughnut';
  sectorChartData: any = { labels: [], datasets: [] };
  sectorChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ' ' + context.label + ': ' + ((this.defaultCurrencyCode) ? this.defaultCurrencyCode : 'USD') +
              ' ' + this.abbreviateAmount(context.parsed);
          }
        }
      }
    }
  };

  donorChartType: any = 'bar';
  donorChartData: any = { labels: [], datasets: [] };
  donorChartOptions: any = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ' ' + ((this.defaultCurrencyCode) ? this.defaultCurrencyCode : 'USD') +
              ' ' + this.abbreviateAmount(context.parsed.x);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 }, callback: (value) => this.abbreviateAmount(value) }
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    }
  };

  trendChartType: any = 'line';
  trendChartData: any = { labels: [], datasets: [] };
  trendChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ' ' + context.dataset.label + ': ' +
              ((this.defaultCurrencyCode) ? this.defaultCurrencyCode : 'USD') +
              ' ' + this.abbreviateAmount(context.parsed.y);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 }, callback: (value) => this.abbreviateAmount(value) }
      }
    }
  };

  regionChartType: any = 'bar';
  regionChartData: any = { labels: [], datasets: [] };
  regionChartOptions: any = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ' ' + ((this.defaultCurrencyCode) ? this.defaultCurrencyCode : 'USD') +
              ' ' + this.abbreviateAmount(context.parsed.x);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 }, callback: (value) => this.abbreviateAmount(value) }
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    }
  };

  budgetChartType: any = 'bar';
  budgetChartData: any = { labels: [], datasets: [] };
  budgetChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return ' ' + context.dataset.label + ': ' +
              ((this.defaultCurrencyCode) ? this.defaultCurrencyCode : 'USD') +
              ' ' + this.abbreviateAmount(context.parsed.y);
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 }, callback: (value) => this.abbreviateAmount(value) }
      }
    }
  };

  infoMessage: string = null;
  showMessage: boolean = false;

  @ViewChild('opsMap') mapContainer!: ElementRef<HTMLDivElement>;
  map: any = null;

  // Fallback coordinates for locations stored without lat/long in the database
  regionCoords: any = {
    'FGS': [2.5000, 45.8000],
    'BRA': [2.0700, 45.3000],
    'Galmudug': [5.5000, 47.0000],
    'Hirshabelle': [3.8000, 46.2000],
    'Jubaland': [0.5000, 42.2000],
    'Puntland': [8.3000, 49.0000],
    'South West': [2.8000, 43.5000],
    'Somaliland': [9.5000, 44.5000],
    'North East': [8.8000, 46.5000]
  };

  constructor(private storeService: StoreService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private projectService: ProjectService,
    private currencyService: CurrencyService,
    private locationService: LocationService,
    private reportService: ReportService,
    private financialYearService: FinancialYearService,
    private sectorTypeService: SectorTypeService,
    private sectorService: SectorService,
    private router: Router) {
  }

  ngOnInit() {
    this.storeService.newReportItem(Settings.dropDownMenus.home);
    this.storeService.currentInfoMessage.subscribe(message => {
      this.infoMessage = message;
      this.showMessage = (message !== null && message !== '');
    });
    setTimeout(() => {
      this.storeService.newInfoMessage('');
      this.showMessage = false;
    }, Settings.displayMessageTime);
    this.getCurrentYearDisbursements();
    this.getUsersCount();
    this.getProjectsCount();
    this.getOrganizationsCount();
    this.getDefaultCurrency();
    this.getLatestProjects();
    this.getFinancialYears();
    this.getSectorTypesList();
    this.loadAllCharts();
  }

  getFinancialYears() {
    this.financialYearService.getYearsList().subscribe(
      data => {
        if (data && data.length) {
          this.yearsList = data.sort((a, b) => a.financialYear - b.financialYear);
        }
      }
    );
  }

  getSearchModel(fromYear: number = 0, toYear: number = 0) {
    var sectorIds: any = [];
    if (this.selectedSectorId) {
      sectorIds = [this.selectedSectorId];
    }
    return {
      projectIds: [],
      startingYear: fromYear || 0,
      endingYear: toYear || 0,
      organizationIds: [],
      sectorIds: sectorIds, locationIds: [], subLocationIds: [], description: '',
      lowerRange: 0, upperRange: 0,
      sectorTypeId: this.selectedSectorTypeId || 0
    };
  }

  loadAllCharts() {
    this.getSectorChart();
    this.getDonorChart();
    this.getYearlyTrendChart();
    this.getBudgetSummaryChart();
    this.reloadMapData();
  }

  onSectorYearFilter() {
    this.isSectorChartLoading = true;
    this.getSectorChart();
  }

  onDonorYearFilter() {
    this.isDonorChartLoading = true;
    this.getDonorChart();
  }

  onTrendYearFilter() {
    this.isTrendChartLoading = true;
    this.getYearlyTrendChart();
  }

  onRegionYearFilter() {
    this.isRegionChartLoading = true;
    this.reloadMapData();
  }

  onBudgetYearFilter() {
    this.isBudgetChartLoading = true;
    setTimeout(() => {
      this.applyBudgetFilter();
    }, 50);
  }

  clearSectorYearFilter() {
    this.sectorFromYear = 0;
    this.sectorToYear = 0;
    this.onSectorYearFilter();
  }

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

  onSectorTypeChange() {
    this.selectedSectorId = 0;
    this.sectorsList = [];
    this.allSectorsList = [];
    if (this.selectedSectorTypeId) {
      this.sectorService.getSectorsForType(this.selectedSectorTypeId.toString()).subscribe(
        data => {
          if (data) {
            this.allSectorsList = data;
            this.sectorsList = data.filter((s: any) => s.parentSector == null);
          }
        }
      );
    }
    this.loadAllCharts();
  }

  onSectorChange() {
    this.loadAllCharts();
  }

  clearDonorYearFilter() {
    this.donorFromYear = 0;
    this.donorToYear = 0;
    this.onDonorYearFilter();
  }

  clearTrendYearFilter() {
    this.trendFromYear = 0;
    this.trendToYear = 0;
    this.onTrendYearFilter();
  }

  clearRegionYearFilter() {
    this.regionFromYear = 0;
    this.regionToYear = 0;
    this.onRegionYearFilter();
  }

  clearBudgetYearFilter() {
    this.budgetFromYear = 0;
    this.budgetToYear = 0;
    this.onBudgetYearFilter();
  }

  getSectorChart() {
    this.reportService.getSectorWiseProjectsReport(this.getSearchModel(this.sectorFromYear, this.sectorToYear)).subscribe(
      data => {
        var sectorsList = (data && data.sectorProjectsList) ? data.sectorProjectsList : [];
        sectorsList = sectorsList.filter(s => s.sectorName != 'Unattributed Sector' || s.totalFunding > 0);
        this.sectorChartData = {
          labels: sectorsList.map(s => this.shortenLabel(s.sectorName, 40)),
          datasets: [{
            data: sectorsList.map(s => Math.round(s.totalFunding)),
            backgroundColor: this.chartColors,
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        };
        this.isSectorChartLoading = false;
      }
    );
  }

  getDonorChart() {
    this.reportService.getOrganizationWiseProjectsReport(this.getSearchModel(this.donorFromYear, this.donorToYear)).subscribe(
      data => {
        var orgsList = (data && data.organizationProjectsList) ? data.organizationProjectsList : [];
        var topDonors = orgsList
          .sort((a, b) => b.totalFunding - a.totalFunding)
          .slice(0, 10);
        this.donorChartData = {
          labels: topDonors.map(o => this.shortenLabel(o.organizationName, 28)),
          datasets: [{
            data: topDonors.map(o => Math.round(o.totalFunding)),
            backgroundColor: '#4189dd',
            hoverBackgroundColor: '#0b2545',
            borderRadius: 6,
            barThickness: 20
          }]
        };
        this.isDonorChartLoading = false;
      }
    );
  }

  getYearlyTrendChart() {
    this.reportService.getYearlyProjectsReport(this.getSearchModel(this.trendFromYear, this.trendToYear)).subscribe(
      data => {
        var yearlyList = (data && data.yearlyProjectsList) ? data.yearlyProjectsList : [];
        yearlyList = yearlyList.sort((a, b) => a.year - b.year);
        this.trendChartData = {
          labels: yearlyList.map(y => y.year),
          datasets: [
            {
              label: 'Actual disbursements',
              data: yearlyList.map(y => Math.round(y.totalActualDisbursements)),
              borderColor: '#4189dd',
              backgroundColor: 'rgba(65, 137, 221, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: '#4189dd'
            },
            {
              label: 'Planned disbursements',
              data: yearlyList.map(y => Math.round(y.totalPlannedDisbursements)),
              borderColor: '#ea580c',
              backgroundColor: 'rgba(234, 88, 12, 0.05)',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: '#ea580c'
            }
          ]
        };
        this.isTrendChartLoading = false;
      }
    );
  }

  getBudgetSummaryChart() {
    this.reportService.getBudgetSummaryReport().subscribe(
      data => {
        this.budgetRawData = (data && data.totalYearlyDisbursements) ? data.totalYearlyDisbursements : [];
        this.applyBudgetFilter();
      }
    );
  }

  applyBudgetFilter() {
    var yearlyDisbursements = this.budgetRawData;
    if (this.budgetFromYear) {
      yearlyDisbursements = yearlyDisbursements.filter(y => y.year >= this.budgetFromYear);
    }
    if (this.budgetToYear) {
      yearlyDisbursements = yearlyDisbursements.filter(y => y.year <= this.budgetToYear);
    }
    yearlyDisbursements = yearlyDisbursements.sort((a, b) => a.year - b.year);
    this.budgetChartData = {
      labels: yearlyDisbursements.map(y => y.year),
      datasets: [
        {
          label: 'Actual',
          data: yearlyDisbursements.map(y => Math.round(y.totalDisbursements)),
          backgroundColor: '#16a34a',
          borderRadius: 4,
          barThickness: 16
        },
        {
          label: 'Planned',
          data: yearlyDisbursements.map(y => Math.round(y.totalExpectedDisbursements)),
          backgroundColor: '#0b2545',
          borderRadius: 4,
          barThickness: 16
        }
      ]
    };
    this.isBudgetChartLoading = false;
  }

  shortenLabel(label: string, maxLength: number) {
    if (!label) {
      return '';
    }
    return (label.length > maxLength) ? (label.substring(0, maxLength) + '\u2026') : label;
  }

  abbreviateAmount(value: any) {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B';
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'K';
    }
    return value;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      this.loadMapData();
    }, 100);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap() {
    const L = (window as any).L;
    if (this.map || !this.mapContainer) {
      return;
    }
    this.map = L.map(this.mapContainer.nativeElement, {
      scrollWheelZoom: false
    }).setView([5.1521, 46.1996], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 4,
      crossOrigin: 'anonymous',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  loadMapData() {
    this.locationService.getLocationsList().subscribe(
      locations => {
        this.cachedLocations = locations ? locations : [];
        this.loadLocationReport();
      },
      error => {
        console.error('[DASH] loadMapData: locations error:', error);
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
    var searchModel = this.getSearchModel(this.regionFromYear, this.regionToYear);
    this.reportService.getLocationWiseProjectsReport(searchModel).subscribe(
      data => {
        var locationProjects = (data && data.locationProjectsList) ? data.locationProjectsList : [];
        var locMap = {};
        this.cachedLocations.forEach(l => { locMap[l.id] = l; });
        var stateIds = this.cachedLocations
          .filter(l => l.parentLocationId == null && !l.isUnAttributed)
          .map(l => l.id);
        var rolledUp = this.rollUpToRegions(locationProjects, locMap, stateIds);
        this.addMarkers(this.cachedLocations, rolledUp);
        this.setupRegionChart(rolledUp, locMap);
        this.isMapLoading = false;
      },
      error => {
        console.error('[DASH] loadLocationReport: API error:', error);
        this.isMapLoading = false;
        this.isRegionChartLoading = false;
      }
    );
  }

  rollUpToRegions(locationProjects: any, locMap: any, stateIds: number[]): any[] {
    var grouped: any = {};
    var order: number[] = [];

    locationProjects.forEach(lp => {
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

  reloadMapData() {
    if (!this.map) {
      return;
    }
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

  addMarkers(locationsList: any, rolledUpData: any) {
    const L = (window as any).L;
    if (!this.map) {
      return;
    }
    var markerBounds = [];
    var legendEntries = [];
    var locMap = {};
    locationsList.forEach(l => { locMap[l.id] = l; });

    var sortedData = rolledUpData
      .filter(item => item.projects && item.projects.length > 0)
      .map(item => {
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
      .filter(item => item && (item.lat || item.lng))
      .sort((a, b) => b.projectsCount - a.projectsCount);

    sortedData.forEach(item => {
      var { loc, lat, lng, projectsCount, totalFunding } = item;
      var radius = 10 + Math.min(18, Math.sqrt(projectsCount));
      var regionColor = this.regionColors[loc.location] || '#4189dd';

      var marker = L.circleMarker([lat, lng], {
        radius: radius,
        color: '#ffffff',
        weight: 2,
        fillColor: regionColor,
        fillOpacity: 0.85
      }).addTo(this.map);

      marker.bindTooltip(loc.location, { direction: 'top' });
      marker.bindPopup(
        '<div style="min-width:170px">' +
        '<b>' + loc.location + '</b><br/>' +
        'Projects: ' + projectsCount + '<br/>' +
        'Total funding: ' + ((this.defaultCurrencyCode) ? this.defaultCurrencyCode : 'USD') + ' ' +
        this.formatNumberWithCommas(Math.round(totalFunding)) +
        '</div>'
      );
      markerBounds.push([lat, lng]);

      if (legendEntries.findIndex(e => e.label === loc.location) === -1) {
        legendEntries.push({ label: loc.location, color: regionColor });
      }
    });

    if (markerBounds.length > 0) {
      this.map.fitBounds(markerBounds, { padding: [40, 40] });
    }
    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
    this.mapLegend = legendEntries;
  }

  setupRegionChart(rolledUpData: any, locMap: any) {
    var regions = rolledUpData
      .filter(r => r.totalFunding > 0)
      .sort((a, b) => b.totalFunding - a.totalFunding);
    this.regionChartData = {
      labels: regions.map(r => this.shortenLabel(r.locationName, 20)),
      datasets: [{
        data: regions.map(r => Math.round(r.totalFunding)),
        backgroundColor: regions.map(r => {
          var loc = locMap[r.locationId];
          return this.regionColors[r.locationName] || (loc ? this.regionColors[loc.location] || '#4189dd' : '#4189dd');
        }),
        borderRadius: 4,
        barThickness: 18
      }]
    };
    this.isRegionChartLoading = false;
  }

  getLatestProjects() {
    this.projectService.getLatestProjects().subscribe(
      data => {
        if (data) {
          this.defaultCurrencyCode = (data.defaultCurrency) ? data.defaultCurrency : null;
          this.latestProjects = (data.projects) ? data.projects : [];
        }
        this.isFeedLoading = false;
      }
    );
  }

  viewProjectDetail(id) {
    if (id) {
      this.router.navigateByUrl('view-project/' + id);
    }
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

  formatNumberWithCommas(value: number) {
    return this.storeService.getNumberWithCommas(value);
  }
}
