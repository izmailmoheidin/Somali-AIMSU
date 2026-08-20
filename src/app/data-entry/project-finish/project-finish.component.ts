import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { ProjectService } from 'src/app/services/project.service';
import { ProjectInfoModalComponent } from 'src/app/project-info-modal/project-info-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'project-finish',
  templateUrl: './project-finish.component.html',
  styleUrls: ['./project-finish.component.css']
})
export class ProjectFinishComponent implements OnInit {

  @Input()
  projectId: number = 0;
  @Input()
  viewProject = {};
  @Input()
  viewProjectFunders: any = [];
  @Input()
  viewProjectLocations: any = [];
  @Input()
  viewProjectSectors: any = [];
  @Input()
  viewProjectImplementers: any = [];
  @Input()
  viewProjectDocuments: any = [];
  @Input()
  viewProjectDisbursements: any = [];
  @Input()
  viewProjectMarkers: any = [];
  @Input()
  returnTo: string = null;
  @Output()
  saveAndFinishRequested = new EventEmitter<any>();

  validationErrors: string[] = [];
  showValidation: boolean = false;

  @BlockUI() blockUI: NgBlockUI;
  constructor(private projectInfoModal: ProjectInfoModalComponent, private projectService: ProjectService,
    private router: Router) { }

  ngOnInit() {
  }

  getProjectView() {
    if (this.projectId != 0) {
      this.projectInfoModal.openModal();
    }
  }

  validateProject(): boolean {
    this.validationErrors = [];
    var project: any = this.viewProject;

    if (!project || !project.title) {
      this.validationErrors.push('Project title is required');
    }
    if (!this.viewProjectFunders || this.viewProjectFunders.length === 0) {
      this.validationErrors.push('At least one funder is required');
    }
    if (!this.viewProjectImplementers || this.viewProjectImplementers.length === 0) {
      this.validationErrors.push('At least one implementer is required');
    }
    if (!this.viewProjectSectors || this.viewProjectSectors.length === 0) {
      this.validationErrors.push('At least one sector is required');
    }
    if (!this.viewProjectLocations || this.viewProjectLocations.length === 0) {
      this.validationErrors.push('At least one location is required');
    }
    return this.validationErrors.length === 0;
  }

  saveAndFinish() {
    this.showValidation = true;
    if (!this.validateProject()) {
      return;
    }
    this.showValidation = false;
    this.finishProject();
  }

  finishProject() {
    localStorage.removeItem('return-to');
    this.router.navigateByUrl('new-project');
  }

  makeDeleteRequest(id: number) {
    if (id) {
      var model = { projectId: id, userId: 0 };
      this.blockUI.start('Making project delete request...');
      this.projectService.makeProjectDeletionRequest(model).subscribe(
        data => {
          if (data) {
            this.router.navigateByUrl('projects');
          }
          this.blockUI.stop();
        }
      );
    }
  }

  goBack() {
    localStorage.setItem('selected-projects', null);
    localStorage.setItem('active-project', '0');
    if (this.returnTo === 'my-organization') {
      localStorage.removeItem('return-to');
      this.router.navigateByUrl('my-organization');
    } else {
      this.router.navigateByUrl('projects');
    }
  }



}
