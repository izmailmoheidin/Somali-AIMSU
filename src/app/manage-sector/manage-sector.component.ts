import { Component, OnInit, Input } from '@angular/core';
import { SectorService } from '../services/sector.service';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../services/store-service';
import { Messages } from '../config/messages';
import { SecurityHelperService } from '../services/security-helper.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { ErrorModalComponent } from '../error-modal/error-modal.component';
import { SectorTypeService } from '../services/sector-types.service';
import { Settings } from '../config/settings';

@Component({
  selector: 'app-manage-sector',
  templateUrl: './manage-sector.component.html',
  styleUrls: ['./manage-sector.component.css']
})
export class ManageSectorComponent implements OnInit {

  @Input()
  isLoading: boolean = true;
  isForEdit: boolean = false;
  isBtnDisabled: boolean = false;
  isDvDisabled: boolean = true;
  sectorId: number = 0;
  btnText: string = 'Add sector';
  sectorTabText: string = 'New sector';
  errorMessage: string = '';
  allSectors: any = [];
  sectors: any = [];
  sectorTypes: any = [];
  editableSectorTypes: any = [];
  sectorChildren: any = [];
  requestNo: number = 0;
  isError: boolean = false;
  showSuccess: boolean = false;
  successMessage: string = '';
  model = { id: 0, sectorTypeId: 0, sectorName: null, parentId: 0 };
  superParentModel = { sectorTypeId: 0, sectorName: null };
  parentSectorModel = { sectorTypeId: 0, sectorName: null, parentId: 0 };
  childSectorModel = { sectorTypeId: 0, sectorName: null, parentId: 0 };
  superParents: any = [];
  parentSectors: any = [];
  activeTab: string = 'superParent';
  selectedSectorTypeId: number = 0;
  permissions: any = {};
  @BlockUI() blockUI!: NgBlockUI;

  constructor(private sectorService: SectorService, private route: ActivatedRoute,
    private router: Router, private errorModal: ErrorModalComponent,
    private storeService: StoreService, private securityService: SecurityHelperService,
    private sectorTypeService: SectorTypeService) {
  }

  ngOnInit() {
    this.permissions = this.securityService.getUserPermissions();
    if (!this.permissions.canEditSector) {
      this.router.navigateByUrl('sectors');
    }
    this.storeService.newReportItem(Settings.dropDownMenus.management);
    if (this.route.snapshot.data && this.route.snapshot.data.isForEdit) {
      const id = this.route.snapshot.params['{id}'];
      if (id) {
        this.model.id = id;
      }
    }

    this.getSectorTypes();
    if (this.model.id != 0) {
      this.btnText = 'Save Sector';
      this.sectorTabText = 'Edit sector';
      this.isForEdit = true;
      this.sectorId = this.model.id;
      this.isDvDisabled = false;
      this.activeTab = 'edit';
      setTimeout(() => {
        this.loadSectorData();
        this.getSectorChildren(this.model.id.toString());
      }, 1000);
    } else {
      this.activeTab = 'superParent';
      this.isLoading = false;
    }

    this.requestNo = this.storeService.getNewRequestNumber();
    this.storeService.currentRequestTrack.subscribe(model => {
      if (model && this.requestNo == model.requestNo && model.errorStatus != 200) {
        this.errorMessage = model.errorMessage;
        this.isError = true;
      }
    });
  }

  getSectorTypes() {
    this.sectorTypeService.getSectorTypesList().subscribe(
      data => {
        if (data) {
          const sectorTypesList = data;
          const defaultSectorType = sectorTypesList.filter((s: any) => s.isPrimary == true);
          this.sectorTypes = sectorTypesList.filter((s: any) => s.isPrimary == true || s.isSourceType == false);
          this.editableSectorTypes = this.sectorTypes.map((t: any) => t.id);
          if (defaultSectorType.length > 0) {
            const defaultTypeId = defaultSectorType[0].id;
            this.selectedSectorTypeId = defaultTypeId;
            this.model.sectorTypeId = defaultTypeId;
            this.superParentModel.sectorTypeId = defaultTypeId;
            this.parentSectorModel.sectorTypeId = defaultTypeId;
            this.childSectorModel.sectorTypeId = defaultTypeId;
            this.getSectors();
          }
        }
      }
    );
  }

  getSectors() {
    this.sectorService.getSectorsList().subscribe(
      data => {
        if (data) {
          this.allSectors = data;
          this.filterSuperParentOptions(this.selectedSectorTypeId);
          this.filterParentOptions(this.selectedSectorTypeId);
          this.filterEditParentSectors(this.selectedSectorTypeId);
        }
      }
    );
  }

  getSectorById(id: number) {
    return this.allSectors.find((s: any) => s.id == id);
  }

  getRootSectors(typeId: number) {
    if (typeId <= 0) {
      return [];
    }
    return this.allSectors.filter((s: any) => s.sectorTypeId == typeId && (!s.parentSectorId || s.parentSectorId == 0));
  }

  getChildSectorsOfType(typeId: number) {
    if (typeId <= 0) {
      return [];
    }
    return this.allSectors.filter((s: any) => s.sectorTypeId == typeId && s.parentSectorId && s.parentSectorId != 0);
  }

  filterSuperParentOptions(typeId: number) {
    this.superParents = this.getRootSectors(typeId);
  }

  filterParentOptions(typeId: number) {
    if (typeId > 0) {
      const rootSectors = this.getRootSectors(typeId);
      if (rootSectors.length > 0) {
        const rootIds = rootSectors.map((s: any) => s.id);
        this.parentSectors = this.allSectors.filter((s: any) => s.sectorTypeId == typeId && s.parentSectorId && rootIds.includes(s.parentSectorId));
        if (this.parentSectors.length === 0) {
          this.parentSectors = rootSectors;
        }
      } else {
        this.parentSectors = [];
      }
    } else {
      this.parentSectors = [];
    }
  }

  onSectorTypeChange(typeId: number) {
    this.selectedSectorTypeId = typeId;
    this.superParentModel.sectorTypeId = typeId;
    this.parentSectorModel.sectorTypeId = typeId;
    this.childSectorModel.sectorTypeId = typeId;
    this.filterSuperParentOptions(typeId);
    this.filterParentOptions(typeId);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'parent') {
      this.parentSectorModel.sectorTypeId = this.selectedSectorTypeId;
      this.filterSuperParentOptions(this.selectedSectorTypeId);
    }
    if (tab === 'child') {
      this.childSectorModel.sectorTypeId = this.selectedSectorTypeId;
      this.filterParentOptions(this.selectedSectorTypeId);
    }
    if (tab === 'superParent') {
      this.superParentModel.sectorTypeId = this.selectedSectorTypeId;
    }
  }

  getSectorChildren(id: string) {
    this.sectorService.getSectorChildren(id).subscribe(
      data => {
        if (data) {
          this.sectorChildren = data;
        }
      },
      error => {
        console.log(error);
      }
    );
  }

  loadSectorData() {
    this.sectorService.getSector(this.sectorId.toString()).subscribe(
      data => {
        if (data) {
          const sectorTypeId = data.sectorTypeId;
          if (sectorTypeId && !this.editableSectorTypes.includes(sectorTypeId)) {
            this.router.navigateByUrl('sectors');
          }
          this.model.id = data.id;
          this.model.sectorTypeId = data.sectorTypeId;
          this.model.parentId = data.parentId;
          this.model.sectorName = data.sectorName;
          this.selectedSectorTypeId = data.sectorTypeId;
          this.filterEditParentSectors(data.sectorTypeId);
        }
        this.isLoading = false;
      },
      error => {
        console.log('Request Failed: ', error);
      }
    );
  }

  filterEditParentSectors(typeId?: number) {
    const sectorTypeId = typeId || this.model.sectorTypeId;
    if (sectorTypeId <= 0) {
      this.sectors = [];
      return;
    }
    const currentSector = this.allSectors.find((s: any) => s.id == this.model.id);
    if (currentSector && (!currentSector.parentSectorId || currentSector.parentSectorId == 0)) {
      this.sectors = [];
    } else {
      const rootSectors = this.getRootSectors(sectorTypeId);
      if (rootSectors.length > 0) {
        const rootIds = rootSectors.map((s: any) => s.id);
        const secondLevel = this.allSectors.filter((s: any) => s.sectorTypeId == sectorTypeId && s.parentSectorId && rootIds.includes(s.parentSectorId));
        if (secondLevel.length > 0 && currentSector && currentSector.parentSectorId && rootIds.includes(currentSector.parentSectorId)) {
          this.sectors = rootSectors;
        } else if (secondLevel.length > 0) {
          this.sectors = secondLevel;
        } else {
          this.sectors = rootSectors;
        }
      } else {
        this.sectors = [];
      }
    }
  }

  saveSector() {
    const model = {
      SectorTypeId: parseInt(this.model.sectorTypeId.toString()),
      SectorName: this.model.sectorName,
      ParentId: parseInt(this.model.parentId.toString()),
    };

    this.isBtnDisabled = true;
    if (this.isForEdit) {
      this.btnText = 'Updating...';
      this.sectorService.updateSector(this.model.id, model).subscribe(
        () => {
          if (!this.isError) {
            const message = 'Sector' + Messages.RECORD_UPDATED;
            this.showSuccessAndRedirect(message);
          } else {
            this.resetFormState();
          }
        },
        error => {
          this.isError = true;
          this.errorMessage = error;
          this.resetFormState();
        }
      );
    } else {
      this.btnText = 'Saving...';
      this.sectorService.addSector(model).subscribe(
        () => {
          if (!this.isError) {
            const message = 'New sector' + Messages.NEW_RECORD;
            this.showSuccessAndRedirect(message);
          } else {
            this.resetFormState();
          }
        },
        error => {
          this.errorMessage = error;
          this.isError = true;
          this.resetFormState();
        }
      );
    }
  }

  saveSuperParent() {
    this.isBtnDisabled = true;
    this.btnText = 'Saving...';
    const model = {
      SectorTypeId: parseInt(this.superParentModel.sectorTypeId.toString()),
      SectorName: this.superParentModel.sectorName,
      ParentId: 0,
    };

    this.sectorService.addSector(model).subscribe(
      () => {
        if (!this.isError) {
          const message = 'New top-level sector' + Messages.NEW_RECORD;
          this.showSuccessAndRedirect(message);
        } else {
          this.resetFormState();
        }
      },
      error => {
        this.errorMessage = error;
        this.isError = true;
        this.resetFormState();
      }
    );
  }

  saveParentSector() {
    this.isBtnDisabled = true;
    this.btnText = 'Saving...';
    const model = {
      SectorTypeId: parseInt(this.parentSectorModel.sectorTypeId.toString()),
      SectorName: this.parentSectorModel.sectorName,
      ParentId: parseInt(this.parentSectorModel.parentId.toString()),
    };

    this.sectorService.addSector(model).subscribe(
      () => {
        if (!this.isError) {
          const message = 'New mid-level sector' + Messages.NEW_RECORD;
          this.showSuccessAndRedirect(message);
        } else {
          this.resetFormState();
        }
      },
      error => {
        this.errorMessage = error;
        this.isError = true;
        this.resetFormState();
      }
    );
  }

  saveChildSector() {
    this.isBtnDisabled = true;
    this.blockUI.start('Saving detail-level sector...');
    const model = {
      SectorTypeId: parseInt(this.childSectorModel.sectorTypeId.toString()),
      SectorName: this.childSectorModel.sectorName,
      ParentId: parseInt(this.childSectorModel.parentId.toString()),
    };

    this.sectorService.addSector(model).subscribe(
      () => {
        this.blockUI.stop();
        if (!this.isError) {
          const message = 'New detail-level sector' + Messages.NEW_RECORD;
          this.showSuccessAndRedirect(message);
        } else {
          this.resetFormState();
        }
      },
      error => {
        this.blockUI.stop();
        this.errorMessage = error;
        this.isError = true;
        this.resetFormState();
      }
    );
  }

  removeChildSector(id: number) {
    this.blockUI.start('Removing sector child...');
    this.sectorService.removeChild(this.model.id.toString(), id.toString()).subscribe(
      () => {
        this.sectorChildren = this.sectorChildren.filter((s: any) => s.id != id);
        this.blockUI.stop();
      },
      error => {
        this.blockUI.stop();
        this.errorMessage = error;
        this.errorModal.openModal();
        this.resetFormState();
      }
    );
  }

  resetFormState() {
    this.isBtnDisabled = false;
    if (this.isForEdit) {
      this.btnText = 'Edit Sector';
    } else {
      this.btnText = 'Add Sector';
    }
  }

  showSuccessAndRedirect(message: string) {
    this.successMessage = message;
    this.showSuccess = true;
    this.storeService.newInfoMessage(message);
    setTimeout(() => {
      this.router.navigateByUrl('sectors');
    }, 1500);
  }

}
