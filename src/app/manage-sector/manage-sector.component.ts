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
  model = { id: 0, sectorTypeId: 0, sectorName: null, parentId: 0 };
  superParentModel = { sectorTypeId: 0, sectorName: null };
  parentSectorModel = { sectorTypeId: 0, sectorName: null, parentId: 0 };
  childSectorModel = { sectorTypeId: 0, sectorName: null, parentId: 0 };
  superParents: any = [];
  parentSectors: any = [];
  activeTab: string = 'superParent';
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
          this.sectors = this.allSectors.filter((s: any) => s.sectorTypeId == this.model.sectorTypeId && s.parentSector == null);
          this.filterSuperParentOptions(this.superParentModel.sectorTypeId);
          this.filterParentOptions(this.childSectorModel.sectorTypeId);
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
    return this.allSectors.filter((s: any) => s.sectorTypeId == typeId && (!s.parentId || s.parentId == 0));
  }

  getSuperParentSectors(typeId: number) {
    if (typeId <= 0) {
      return [];
    }
    // Super-parents are stored at root level in the same table.
    // Return all root sectors (actual super-parents will be a subset stored in DB later).
    return this.getRootSectors(typeId);
  }

  filterSuperParentOptions(typeId: number) {
    this.superParents = this.getSuperParentSectors(typeId);
  }

  filterParentOptions(typeId: number) {
    if (typeId > 0) {
      // Use root sectors as the source of truth for parents.
      const rootSectors = this.getRootSectors(typeId);
      if (rootSectors.length > 0) {
        const rootIds = rootSectors.map((s: any) => s.id);
        // parentSectors are those whose parentId is one of the root sector ids
        this.parentSectors = this.allSectors.filter((s: any) => s.sectorTypeId == typeId && s.parentId && rootIds.includes(s.parentId));
        // If no second-level parents exist yet, expose root sectors as possible parents
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

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'parent') {
      this.filterSuperParentOptions(this.parentSectorModel.sectorTypeId);
    }
    if (tab === 'child') {
      this.filterParentOptions(this.childSectorModel.sectorTypeId);
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
        }
        this.isLoading = false;
      },
      error => {
        console.log('Request Failed: ', error);
      }
    );
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
            this.storeService.newInfoMessage(message);
            this.router.navigateByUrl('sectors');
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
            this.storeService.newInfoMessage(message);
            this.router.navigateByUrl('sectors');
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
          const message = 'New super parent sector' + Messages.NEW_RECORD;
          this.storeService.newInfoMessage(message);
          this.router.navigateByUrl('sectors');
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
          const message = 'New parent sector' + Messages.NEW_RECORD;
          this.storeService.newInfoMessage(message);
          this.router.navigateByUrl('sectors');
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
    this.blockUI.start('Saving child sector...');
    const model = {
      SectorTypeId: parseInt(this.childSectorModel.sectorTypeId.toString()),
      SectorName: this.childSectorModel.sectorName,
      ParentId: parseInt(this.childSectorModel.parentId.toString()),
    };

    this.sectorService.addSector(model).subscribe(
      () => {
        this.blockUI.stop();
        if (!this.isError) {
          const message = 'New child sector' + Messages.NEW_RECORD;
          this.storeService.newInfoMessage(message);
          this.router.navigateByUrl('sectors');
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

}
