<template>
    <div style="flex:1;">
        <mySchedule></mySchedule>
    </div>
</template>

<!--引入bui-weex样式文件-->
<style lang="scss" src="bui-weex/src/css/buiweex.scss"></style>

<script>
    import mySchedule from "./mySchedule.vue";
    module.exports = {
        data () {
            return {}
        },
        components: {
          mySchedule
        }
    }
</script>