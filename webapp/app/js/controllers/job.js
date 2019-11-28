/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

'use strict';

KylinApp
    .controller('JobCtrl', function ($scope, $q, $routeParams, $interval, $modal, ProjectService, MessageService, JobService,SweetAlert,loadingRequest,UserService,jobConfig,JobList,$window, MessageBox) {

        $scope.jobList = JobList;
        JobList.removeAll();
        $scope.jobConfig = jobConfig;
        $scope.cubeName = JobList.jobFilter.cubeName;
        //$scope.projects = [];
        $scope.action = {};
        $scope.timeFilter = jobConfig.timeFilter[JobList.jobFilter.timeFilterId];
        $scope.searchMode = jobConfig.searchMode[JobList.jobFilter.searchModeId];
        if ($routeParams.jobTimeFilter) {
            $scope.timeFilter = jobConfig.timeFilter[$routeParams.jobTimeFilter];
        }

        $scope.status = [];
        for(var i in JobList.jobFilter.statusIds){
            for(var j in jobConfig.allStatus){
                if(JobList.jobFilter.statusIds[i] == jobConfig.allStatus[j].value){
                    $scope.status.push(jobConfig.allStatus[j]);
                    break;
                }
            }
        }
        $scope.toggleSelection = function toggleSelection(current) {
            var idx = $scope.status.indexOf(current);
            if (idx > -1) {
              $scope.status.splice(idx, 1);
            }else {
              $scope.status.push(current);
            }
        };



        $scope.tabs=[
          {
            "title":"任务",
            "active":true
          },
          {
            "title": "慢查询",
            "active": false
          }
        ]

        // projectName from page ctrl
        $scope.state = {loading: false, refreshing: false, filterAttr: 'last_modified', filterReverse: true, reverseColumn: 'last_modified', projectName:$scope.projectModel.selectedProject};

        $scope.list = function (offset, limit) {
            var defer = $q.defer();
            if(!$scope.projectModel.projects.length){
                defer.resolve([]);
              return  defer.promise;
            }
            offset = (!!offset) ? offset : 0;

            var statusIds = [];
            angular.forEach($scope.status, function (statusObj, index) {
                statusIds.push(statusObj.value);
            });

            $scope.cubeName=$scope.cubeName == ""?null:$scope.cubeName;
            JobList.jobFilter.cubeName = $scope.cubeName;
            JobList.jobFilter.timeFilterId = $scope.timeFilter.value;
            JobList.jobFilter.searchModeId = _.indexOf(jobConfig.searchMode, $scope.searchMode);
            JobList.jobFilter.statusIds = statusIds;

            var jobRequest = {
                cubeName: $scope.cubeName,
                projectName: $scope.state.projectName,
                status: statusIds,
                offset: offset,
                limit: limit,
                timeFilter: $scope.timeFilter.value,
                jobSearchMode: $scope.searchMode.value
            };
            $scope.state.loading = true;

            return JobList.list(jobRequest).then(function(resp){
                $scope.state.loading = false;
                if (angular.isDefined($scope.state.selectedJob)) {
                    $scope.state.selectedJob = JobList.jobs[ $scope.state.selectedJob.uuid];
                }
                defer.resolve(resp);
                return defer.promise;
            },function(resp){
              $scope.state.loading = false;
              defer.resolve([]);
              SweetAlert.swal('糟糕...', resp, 'error');
              return defer.promise;
            });
        }

        $scope.reload = function () {
            // trigger reload action in pagination directive
            $scope.action.reload = !$scope.action.reload;
        };


        $scope.$watch('projectModel.selectedProject', function (newValue, oldValue) {
            if(newValue!=oldValue||newValue==null){
                JobList.removeAll();
                $scope.state.projectName = newValue;
                $scope.reload();
            }

        });
        $scope.resume = function (job) {
            SweetAlert.swal({
                title: '',
                text: '你确定要恢复工作吗?',
                type: '',
                showCancelButton: true,
                confirmButtonColor: '#DD6B55',
                confirmButtonText: "是",
				cancelButtonText: "取消",
                closeOnConfirm: true
            }, function(isConfirm) {
              if(isConfirm) {
                loadingRequest.show();
                JobService.resume({jobId: job.uuid}, {}, function (job) {
                  loadingRequest.hide();
                  JobList.jobs[job.uuid] = job;
                  if (angular.isDefined($scope.state.selectedJob)) {
                    $scope.state.selectedJob = JobList.jobs[$scope.state.selectedJob.uuid];
                  }
                  MessageBox.successNotify('作业已成功恢复!');
                }, function (e) {
                  loadingRequest.hide();
                  if (e.data && e.data.exception) {
                    var message = e.data.exception;
                    var msg = !!(message) ? message : '无法采取行动。';
                    SweetAlert.swal('糟糕...', msg, 'error');
                  } else {
                    SweetAlert.swal('糟糕...', "无法采取行动。", 'error');
                  }
                });
              }
            });
        }


        $scope.cancel = function (job) {
            SweetAlert.swal({
                title: '',
                text: '你确定放弃工作吗?',
                type: '',
                showCancelButton: true,
                confirmButtonColor: '#DD6B55',
                confirmButtonText: "是",
				cancelButtonText: "取消",
                closeOnConfirm: true
            }, function(isConfirm) {
              if(isConfirm) {
                loadingRequest.show();
                JobService.cancel({jobId: job.uuid}, {}, function (job) {
                    loadingRequest.hide();
                    $scope.safeApply(function() {
                        JobList.jobs[job.uuid] = job;
                        if (angular.isDefined($scope.state.selectedJob)) {
                            $scope.state.selectedJob = JobList.jobs[ $scope.state.selectedJob.uuid];
                        }

                    });
                    MessageBox.successNotify('作业已成功丢弃!');
                },function(e){
                    loadingRequest.hide();
                    if(e.data&& e.data.exception){
                        var message =e.data.exception;
                        var msg = !!(message) ? message : '无法采取行动。';
                        SweetAlert.swal('糟糕...', msg, 'error');
                    }else{
                        SweetAlert.swal('糟糕...', "无法采取行动。", 'error');
                    }
                });
              }
            });
        }

      $scope.pause = function (job) {
        SweetAlert.swal({
          title: '',
          text: '你确定要暂停工作吗?',
          type: '',
          showCancelButton: true,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: "是",
		  cancelButtonText: "取消", 
          closeOnConfirm: true
        }, function(isConfirm) {
          if(isConfirm) {
            loadingRequest.show();
            JobService.pause({jobId: job.uuid}, {}, function (job) {
              loadingRequest.hide();
              $scope.safeApply(function() {
                JobList.jobs[job.uuid] = job;
                if (angular.isDefined($scope.state.selectedJob)) {
                  $scope.state.selectedJob = JobList.jobs[ $scope.state.selectedJob.uuid];
                }

              });
              MessageBox.successNotify('作业已成功暂停!');
            },function(e){
              loadingRequest.hide();
              if(e.data&& e.data.exception){
                var message =e.data.exception;
                var msg = !!(message) ? message : '无法采取行动。';
                SweetAlert.swal('糟糕...', msg, 'error');
              }else{
                SweetAlert.swal('糟糕...', "无法采取行动。", 'error');
              }
            });
          }
        });
      }

     $scope.drop = function (job) {
        SweetAlert.swal({
          title: '',
          text: '你确定要删除工作吗?',
          type: '',
          showCancelButton: true,
          confirmButtonColor: '#DD6B55',
          confirmButtonText: "是",
		  cancelButtonText: "取消",
          closeOnConfirm: true
        }, function(isConfirm) {
          if(isConfirm) {
            loadingRequest.show();
            JobService.drop({jobId: job.uuid}, {}, function (job) {
              loadingRequest.hide();
              MessageBox.successNotify('作业已成功删除!');
              $scope.jobList.jobs[job.uuid].dropped = true;
            },function(e){
              loadingRequest.hide();
              if(e.data&& e.data.exception){
                var message =e.data.exception;
                var msg = !!(message) ? message : '无法采取行动。';
                SweetAlert.swal('糟糕...', msg, 'error');
              }else{
                SweetAlert.swal('糟糕...', "无法采取行动。", 'error');
              }
            });
          }
        });
      }

      $scope.diagnosisJob =function(job) {
        if (!job){
          SweetAlert.swal('', "未选择作业。", 'info');
          return;
        }
        var downloadUrl = Config.service.url + 'diag/job/'+job.uuid+'/download';
        $window.open(downloadUrl);
      }

        $scope.openModal = function () {
            if (angular.isDefined($scope.state.selectedStep)) {
                if ($scope.state.stepAttrToShow == "output") {
                    $scope.state.selectedStep.loadingOp = true;
                    internalOpenModal();
                    var stepId = $scope.state.selectedStep.sequence_id;
                    JobService.stepOutput({jobId: $scope.state.selectedJob.uuid, propValue: $scope.state.selectedStep.id}, function (result) {
                        if (angular.isDefined(JobList.jobs[result['jobId']])) {
                            var tjob = JobList.jobs[result['jobId']];
                            tjob.steps[stepId].cmd_output = result['cmd_output'];
                            tjob.steps[stepId].loadingOp = false;
                        }
                    },function(e){
                      SweetAlert.swal('糟糕...',"无法加载作业信息，请检查系统日志以获取详细信息。", 'error');
                    });
                } else {
                    internalOpenModal();
                }
            }
        }

        function internalOpenModal() {
            $modal.open({
                templateUrl: 'jobStepDetail.html',
                controller: jobStepDetail,
                resolve: {
                    step: function () {
                        return $scope.state.selectedStep;
                    },
                    attr: function () {
                        return $scope.state.stepAttrToShow;
                    }
                }
            });
        }
    }
);

var jobStepDetail = function ($scope, $modalInstance, step, attr) {
    $scope.step = step;
    $scope.stepAttrToShow = attr;
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    }
};
