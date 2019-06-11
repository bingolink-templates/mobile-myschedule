<template>
  <div ref="wrap">
    <!-- 日程 -->
    <div class="my-schedule">
      <div class="my-schedule-title flex">
        <text class="f28 fw5 c0">{{i18n.Schedule}}</text>
        <text class="f24 c153 fw4 pl20 pt10 pb10" @click="myScheduleMoreEvent">{{i18n.All}}</text>
      </div>
      <div class="my-schedule-data flex">
        <div class="flex-ac" v-for="(item, index) in myScheduleArr" :key='index'
          @click='myScheduleEvent(item.data,index)'>
          <text class="c153 f28 fw4 tc">{{item.day}}</text>
          <text class="f24 c153 fw4 now-schedule"
            v-if='getCurrentDay==(item.data.length ==1?"0"+item.data:item.data)'>{{item.data}}</text>
          <text class="f24 c153 fw4 not-schedule"
            v-if='getCurrentDay!=(item.data.length ==1?"0"+item.data:item.data)'>{{item.data}}</text>
        </div>
      </div>
    </div>
    <div v-if='!isShowLoad'>
      <div class="my-schedule-content" v-if='scheduleItem.length!=0'>
        <text class="f24 fw4 c153">共{{scheduleItem.length}}个日程</text>
        <div :class="[index == (scheduleItem.length-1)? 'border-no-bottom' : 'border-bottom']"
          v-for="(item,index) in scheduleItem" :key='index' @click='scheduleEvent(item.id,item.type)'>
          <div class="content-item flex-jc">
            <div class="flex-dr flex-ac">
              <div class="item-dot"></div>
              <text class="f28 fw4 c0">{{item.name}}</text>
            </div>
            <text class="f24 c153 fw4 pl34 mt4">{{item.time}}</text>
          </div>
        </div>
      </div>
      <div class="my-schedule-no-content flex-ac flex-jc" v-if='scheduleItem.length==0'>
        <div class="flex-dr">
          <bui-image src="/image/sleep.png" width="42px" height="39px"></bui-image>
          <text class="f26 c51 fw4 pl15 center-height">{{isError?i18n.NoneData:i18n.ErrorLoadData}}</text>
        </div>
      </div>
    </div>
    <div class="my-schedule-no-content flex-ac flex-jc" v-if='isShowLoad'>
      <div ref='transform'>
        <bui-icon name="ion-android-refresh" size=60></bui-icon>
      </div>
    </div>
  </div>
</template>

<script>
  const link = weex.requireModule("LinkModule");
  const animation = weex.requireModule('animation')
  const dom = weex.requireModule('dom');
  const linkapi = require('linkapi');
  export default {
    data() {
      return {
        myScheduleArr: [],
        scheduleItem: [],
        getCurrentDay: '',
        isShowLoad: true,
        isError: true,
        channel: new BroadcastChannel('WidgetsMessage'),
        i18n: ''
      }
    },
    methods: {
      scheduleEvent(id, type) {
        link.launchLinkService(['[OpenApp] \n appCode=crm \n appUrl=LinkOl\\Modular\\other\\scheduleHome.html \n id=' +
          id + '\n type=' + type + ''
        ], (res) => {}, (err) => {});
      },
      animationLoad() {
        let loadElement = this.$refs.transform
        let index = 0;
        this.timeOut = setInterval(() => {
          index++
          animation.transition(loadElement, {
            styles: {
              transform: 'rotate(' + 40 * index + 'deg)',
            },
            duration: 40,
            timingFunction: 'ease',
            needLayout: false,
            delay: 0
          }, function () {})
        }, 100);
      },
      // 更多
      myScheduleMoreEvent() {
        link.launchLinkService(['[OpenBuiltIn] \n key=MySchedule'], (res) => {}, (err) => {});
      },
      // 日期
      myScheduleEvent(item, index) {
        if (this.getCurrentDay == item)
          return
        this.isShowLoad = true
        this.getCurrentDay = item.length == 1 ? "0" + item : item
        let search = this.getNowFormatDate(1);
        let searchTime = this.dealTime(index, search, 2)
        let start = searchTime + ' 00:00:00'
        let startDate = new Date(start)
        let end = searchTime + ' 23:59:59'
        let endDate = new Date(end)
        this.getSchedule(startDate.getTime(), endDate.getTime())
      },
      getSchedule(start, end) {
        link.getServerConfigs([], (params) => {
          let sqls = [];
          if (end) sqls.push('UNIX_TIMESTAMP(startTime) <= ' + end / 1000);
          if (start) sqls.push(' UNIX_TIMESTAMP(endTime)>= ' + start / 1000);
          let objData = {
            entityName: 'ExtendSchedule',
            searchType: 0,
            pageSize: '',
            page: '',
            keyWord: '',
            orderBy: 'startTime asc',
            parentId: '',
            scope: 'all',
            whereFilter: sqls.join(' and '),
            endTime: '',
            startTime: ''
          }
          let reqObjData = JSON.parse(JSON.stringify(objData))
          reqObjData['searchType'] = 4

          let index = 0;
          let promiseOne;
          let promiseTwo;
          // 内部数据
          linkapi.get({
            url: params.specialUri + '/webCommon/getList',
            data: objData
          }).then((res) => {
            if (res.success == true) {
              index++
              promiseOne = res
              if (index == 2) {
                this.getdata(promiseOne, promiseTwo)
              }
            }
          })
          // 外部数据
          linkapi.get({
            url: params.specialUri + '/webCommon/getList',
            data: reqObjData
          }).then((res) => {
            if (res.success == true) {
              index++
              promiseTwo = res
              if (index == 2) {
                this.getdata(promiseOne, promiseTwo)
              }
            }
          })
        }, (err) => {
          this.error()
        });
      },
      getdata(promiseOne, promiseTwo) {
        let scheduleArr = []
        this.isError = true
        this.isShowLoad = false
        this.broadcastWidgetHeight()
        if (JSON.stringify(promiseOne.data) != '[]') {
          scheduleArr = promiseOne.data
        }
        if (JSON.stringify(promiseTwo.data) != '[]') {
          scheduleArr = scheduleArr.concat(promiseTwo.data)
        }
        let scheduleArrItem = []
        for (let index = 0; index < scheduleArr.length; index++) {
          let scheduleObj = {}
          let time = scheduleArr[index].startTimeDisplayValue.split(' ')[1] +
            '-' + scheduleArr[index].endTimeDisplayValue.split(' ')[1]
          scheduleObj['time'] = time
          scheduleObj['name'] = scheduleArr[index].name
          scheduleObj['id'] = scheduleArr[index].id
          scheduleObj['type'] = scheduleArr[index].status
          scheduleArrItem.push(scheduleObj)
        }
        this.scheduleItem = []
        this.scheduleItem = scheduleArrItem
      },
      error() {
        this.isShowLoad = false
        this.isError = false
        this.broadcastWidgetHeight()
      },
      getNowFormatDate(type) {
        let date = new Date(),
          year = date.getFullYear(),
          month = date.getMonth() + 1,
          strDate = date.getDate(),
          currentdate = ''
        if (month >= 1 && month <= 9) {
          month = "0" + month;
        }
        if (strDate >= 0 && strDate <= 9) {
          strDate = "0" + strDate;
        }
        if (type == 1) {
          currentdate = year + month + strDate;
        } else {
          currentdate = year + '/' + month + '/' + strDate;
        }
        return currentdate;
      },
      dealTime(dayNum, dat, type) {
        if (dayNum == "0") {
          dayNum = 0;
        }
        let uom = new Date(),
          fday = '';
        fday = dat.substring(6, 8);
        uom.setYear(dat.substring(0, 4));
        uom.setMonth(parseInt(dat.substring(4, 6)) - 1);
        uom.setDate(fday);
        if (uom.getDay() == 0) {
          uom.setDate(uom.getDate() + (dayNum));
        } else {
          uom.setDate(uom.getDate() - (uom.getDay() - dayNum));
        }
        let year = uom.getFullYear();
        let mon = (uom.getMonth() + 1) + '';
        let day = uom.getDate() + '';
        let dateStr = '' + uom.getFullYear() + '/' + mon + '/' + day;
        if (type == 1) {
          return day;
        } else {
          return dateStr;
        }
      },
      getData() {
        let searchTime = this.getNowFormatDate(1);
        this.getCurrentDay = searchTime.substring(6, 8)
        let dataArr = [{
          day: '日'
        }, {
          day: '一'
        }, {
          day: '二'
        }, {
          day: '三'
        }, {
          day: '四'
        }, {
          day: '五'
        }, {
          day: '六'
        }]
        let newData = []
        let obj = {}
        for (let index = 0; index < 7; index++) {
          obj = dataArr[index]
          obj['data'] = this.dealTime(index, searchTime, 1)
          newData.push(obj)
        }
        this.myScheduleArr = newData
      },
      broadcastWidgetHeight() {
        let _params = this.$getPageParams();
        setTimeout(() => {
          dom.getComponentRect(this.$refs.wrap, (ret) => {
            this.channel.postMessage({
              widgetHeight: ret.size.height,
              id: _params.id
            });
          });
        }, 100)
      },
      RefreshData() {
        this.getData()
        let searchTime = this.getNowFormatDate(2);
        let start = searchTime + ' 00:00:00'
        let startDate = new Date(start)
        let end = searchTime + ' 23:59:59'
        let endDate = new Date(end)
        this.getSchedule(startDate.getTime(), endDate.getTime())
      }
    },
    created() {
      linkapi.getLanguage((res) => {
        this.i18n = this.$window[res]
      })
    },
    mounted() {
      this.channel.onmessage = (event) => {
        if (event.data.action === 'RefreshData') {
          this.RefreshData()
        }
      }
      this.RefreshData()
    }
  }
</script>

<style lang="css" src="../css/common.css"></style>
<style>
  .my-schedule {
    background-color: #fff;
  }

  .my-schedule-title {
    height: 40px;
    margin: 18px 23px 44px 25px;
  }

  .my-schedule-data {
    padding: 0 40px 24px 40px;
  }

  .now-schedule {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    text-align: center;
    line-height: 48px;
    margin-top: 28px;
    color: #fff;
    background-color: #4DA4FE;
  }

  .not-schedule {
    width: 48px;
    height: 48px;
    margin-top: 28px;
    text-align: center;
    line-height: 48px;
  }

  .my-schedule-content {
    margin-top: 10px;
    padding: 25px 26px 17px 26px;
    background-color: #fff;
  }

  .my-schedule-no-content {
    height: 166px;
    margin-top: 1px;
    background-color: #fff;
  }

  .content-item {
    height: 118px;
    margin: 22px 0 4px 0;
  }

  .border-bottom {
    border-bottom: 1px solid #E8E8E8;
  }

  .border-no-bottom {
    border-bottom: 1px solid #fff;
  }

  .item-dot {
    width: 10px;
    height: 10px;
    background: rgba(77, 164, 254, 1);
    border-radius: 5px;
    margin-right: 24px;
  }

  .center-height {
    line-height: 40px;
  }
</style>