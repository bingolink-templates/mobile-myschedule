<template>
    <div ref="wrap" class="main">
        <!-- 日程 -->
        <div class="my-schedule">
            <div class="my-schedule-title flex">
                <text class="f28 fw5 c0">{{i18n.Schedule}}</text>
                <text class="f24 c153 fw4 pl20 pt10 pb10" @click="myScheduleMoreEvent">{{i18n.All}}</text>
            </div>
            <div class="my-schedule-data flex">
                <div class="flex-ac" v-for="(item, index) in myScheduleArr" :key="index" @click="myScheduleEvent(item.data,index)">
                    <text class="c153 f28 fw4 tc">{{item.day}}</text>
                    <text class="f24 c153 fw4 now-schedule" v-if="getCurrentDay==(item.data.length ==1?'0'+item.data:item.data)">{{item.data}}</text>
                    <text class="f24 c153 fw4 not-schedule" v-if="getCurrentDay!=(item.data.length ==1?'0'+item.data:item.data)">{{item.data}}</text>
                </div>
            </div>
        </div>
        <div v-if="!isShowLoad">
            <div class="my-schedule-content" v-if="scheduleItem.length!=0">
                <text class="f24 fw4 c153">{{AllSchedule}}</text>
                <div :class="[index == (scheduleItem.length-1)? 'border-no-bottom' : 'border-bottom']" v-for="(item,index) in scheduleItem"
                    :key="index" @click="scheduleEvent(item.id,item.type)">
                    <div class="content-item flex-jc">
                        <div class="flex-dr flex-ac">
                            <div class="item-dot"></div>
                            <text class="f28 fw4 c0 lines1">{{item.name}}</text>
                        </div>
                        <text class="f24 c153 fw4 pl34 mt4">{{item.time}}</text>
                    </div>
                </div>
            </div>
            <div class="my-schedule-no-content flex-ac flex-jc" v-if="scheduleItem.length==0">
                <div class="flex-dr">
                    <bui-image src="/image/sleep.png" width="42px" height="39px"></bui-image>
                    <text class="f26 c51 fw4 pl15 center-height">{{isError?i18n.NoneData:i18n.ErrorLoadData}}</text>
                </div>
            </div>
        </div>
        <div class="my-schedule-no-content flex-ac flex-jc" v-if="isShowLoad">
            <div ref="transform">
                <bui-image src="/image/refresh.gif" width="60" height="60"></bui-image>
            </div>
        </div>
    </div>
</template>

<script>
    const link = weex.requireModule('LinkModule')
    const animation = weex.requireModule('animation')
    const dom = weex.requireModule('dom')
    const linkapi = require('linkapi')
    export default {
        data() {
            return {
                myScheduleArr: [],
                scheduleItem: [],
                getCurrentDay: '',
                AllSchedule: '',
                isShowLoad: true,
                isError: true,
                channel: new BroadcastChannel('WidgetsMessage'),
                i18n: '',
                DATE_TIME: 1000 * 60 * 60 * 24
            }
        },
        mounted() {
            this.channel.onmessage = event => {
                if (event.data.action === 'RefreshData') {
                    linkapi.getLanguage(res => {
                        this.i18n = this.$window[res]
                        this.RefreshData()
                    })
                }
            }

            linkapi.getLanguage(res => {
                this.i18n = this.$window[res]
                this.RefreshData()
            })
        },
        methods: {
            scheduleEvent(id, type) {
                link.launchLinkService(['[OpenApp] \n appCode=crm \n appUrl=LinkOl\\Modular\\other\\scheduleHome.html \n id=' + id + '\n type=' + type + ''],
                    res => { }, err => { }
                )
            },
            // 更多
            myScheduleMoreEvent() {
                link.launchLinkService(['[OpenBuiltIn] \n key=MySchedule'], res => { }, err => { })
            },
            // 日期
            myScheduleEvent(item, index) {
                if (this.getCurrentDay == item) return
                this.isShowLoad = true
                this.getCurrentDay = item.length == 1 ? '0' + item : item
                let search = this.getNowFormatDate(1)
                let searchTime = this.dealTime(index, search, 2)
                let start = searchTime + ' 00:00:00'
                let startDate = new Date(start)
                let end = searchTime + ' 23:59:59'
                let endDate = new Date(end)
                let searchDay = this.dealTime(index, search, 3)
                this.getSchedule(startDate.getTime(), endDate.getTime(), searchDay)
            },
            getSchedule(start, end, searchTime) {
                link.getServerConfigs([], params => {
                    let sqls = []
                    if (end)
                        sqls.push('UNIX_TIMESTAMP(startTime) <= ' + end / 1000)
                    if (start)
                        sqls.push(' UNIX_TIMESTAMP(endTime)>= ' + start / 1000)
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

                    let index = 0
                    let promiseOne
                    let promiseTwo
                    // 内部数据
                    linkapi.get({
                        url: params.specialUri + '/webCommon/getList',
                        data: objData
                    }).then(res => {
                        if (res.success == true) {
                            index++
                            promiseOne = res
                            if (index == 2) {
                                this.getdata(promiseOne, promiseTwo, searchTime)
                            }
                        }
                    })
                    // 外部数据
                    linkapi.get({
                        url: params.specialUri + '/webCommon/getList',
                        data: reqObjData
                    }).then(res => {
                        if (res.success == true) {
                            index++
                            promiseTwo = res
                            if (index == 2) {
                                this.getdata(promiseOne, promiseTwo, searchTime)
                            }
                        }
                    })
                }, err => {
                    this.error()
                }
                )
            },
            format(ts, fmt) {
                if (!ts) return '';
                if (!fmt) fmt = 'yyyy/MM/dd hh:mm:ss'
                var dt = new Date(ts)
                var o = {
                    'M+': dt.getMonth() + 1, // 月份
                    'd+': dt.getDate(), // 日
                    'h+': dt.getHours(), // 小时
                    'm+': dt.getMinutes(), // 分
                    's+': dt.getSeconds(), // 秒
                    'q+': Math.floor((dt.getMonth() + 3) / 3), // 季度
                    'S': dt.getMilliseconds() // 毫秒
                }
                if (/(y+)/.test(fmt)) {
                    let $1 = fmt.split('-')[0]
                    fmt = fmt.replace(RegExp.$1, (dt.getFullYear() + '').substr(4 - RegExp.$1.length))
                }
                for (var k in o) {
                    if (new RegExp('(' + k + ')').test(fmt)) {
                        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
                    }
                }
                return fmt
            },
            formatCalendarDate(time) {
                return new Date(this.format(new Date(time), 'yyyy/MM/dd') + ' 00:00:00').getTime();
            },
            //将时间段切成天
            cutPeriodToDay(startTime, endTime, isAllDay) {
                if (startTime > endTime) return {};
                var days = {};
                var startDay = this.formatCalendarDate(startTime);
                for (; startDay <= endTime; startDay += this.DATE_TIME) {
                    var dayStr = this.format(new Date(startDay), 'yyyy/MM/dd'),
                        dS = new Date(dayStr + ' 00:00:00').getTime(),
                        dE = new Date(dayStr + ' 23:59:59').getTime();
                    if (startTime <= dS && dE <= endTime || isAllDay) { //全天
                        days[dayStr] = this.i18n.Date_ALLDay;
                    } else if (startTime > dS && dE > endTime) { //某天内
                        days[dayStr] = this.format(new Date(startTime), 'hh:mm') + '-'
                            + this.format(new Date(endTime), 'hh:mm');
                    } else if (startTime > dS && dE <= endTime) { //开始于
                        days[dayStr] = this.format(new Date(startTime), 'hh:mm');
                    } else if (startTime <= dS && dE > endTime) { //结束于
                        days[dayStr] = this.i18n.Date_End + this.format(new Date(endTime), 'hh:mm');
                    }
                }
                return days;
            },
            getdata(promiseOne, promiseTwo, searchTime) {
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
                    let timeObj = this.cutPeriodToDay(scheduleArr[index].startTime, scheduleArr[index].endTime, scheduleArr[index].isAllDay);
                    scheduleObj['time'] = timeObj[searchTime]
                    scheduleObj['name'] = scheduleArr[index].name
                    scheduleObj['id'] = scheduleArr[index].id
                    scheduleObj['type'] = scheduleArr[index].status
                    scheduleArrItem.push(scheduleObj)
                }
                this.scheduleItem = []
                this.scheduleItem = scheduleArrItem
                this.AllSchedule = this.i18n.AllSchedule.replace(/%s/g, '' + scheduleArrItem.length + '')
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
                    month = '0' + month
                }
                if (strDate >= 0 && strDate <= 9) {
                    strDate = '0' + strDate
                }
                if (type == 1) {
                    currentdate = year + month + strDate
                } else {
                    currentdate = year + '/' + month + '/' + strDate
                }
                return currentdate
            },
            dealTime(dayNum, dat, type) {
                if (dayNum == '0') {
                    dayNum = 0
                }
                let uom = new Date(),
                    fday = ''
                fday = dat.substring(6, 8)
                uom.setYear(dat.substring(0, 4))
                uom.setMonth(parseInt(dat.substring(4, 6)) - 1)
                uom.setDate(fday)
                if (uom.getDay() == 0) {
                    uom.setDate(uom.getDate() + dayNum)
                } else {
                    uom.setDate(uom.getDate() - (uom.getDay() - dayNum))
                }
                let year = uom.getFullYear()
                let mon = uom.getMonth() + 1 + ''
                let day = uom.getDate() + ''
                let dateStr = '' + uom.getFullYear() + '/' + mon + '/' + day
                if (type == 1) {
                    return day
                } else if (type == 2) {
                    return dateStr
                } else {
                    if (mon >= 1 && mon <= 9) {
                        mon = '0' + mon
                    }
                    return '' + uom.getFullYear() + '/' + mon + '/' + day
                }
            },
            getData() {
                let searchTime = this.getNowFormatDate(1)
                this.getCurrentDay = searchTime.substring(6, 8)
                let dataArr = [
                    {
                        day: this.i18n.Sun
                    },
                    {
                        day: this.i18n.Mon
                    },
                    {
                        day: this.i18n.Tues
                    },
                    {
                        day: this.i18n.Wed
                    },
                    {
                        day: this.i18n.Thurs
                    },
                    {
                        day: this.i18n.Fri
                    },
                    {
                        day: this.i18n.Sat
                    }
                ]
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
				}, 200)
            },
            RefreshData() {
                this.getData()
                let searchTime = this.getNowFormatDate(2)
                let start = searchTime + ' 00:00:00'
                let startDate = new Date(start)
                let end = searchTime + ' 23:59:59'
                let endDate = new Date(end)
                this.getSchedule(startDate.getTime(), endDate.getTime(), searchTime)
            }
        }
    }
</script>

<style lang="css" src="../css/common.css"></style>
<style>
    .main {
        flex: 1;
        background-color: #666;
    }
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
        background-color: #4da4fe;
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
        padding: 25px 26px 10px 26px;
        background-color: #fff;
    }

    .my-schedule-no-content {
        height: 166px;
        margin-top: 1px;
        background-color: #fff;
    }

    .content-item {
        height: 90px;
        margin: 10px 0 4px 0;
    }

    .border-bottom {
        border-bottom: 1px solid #e8e8e8;
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