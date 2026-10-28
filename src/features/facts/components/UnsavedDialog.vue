<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
defineProps<{open: boolean}>()
const emit=defineEmits<{settle:[value:boolean]}>()
</script>
<template><Dialog :open="open" @update:open="value=>{if(!value)emit('settle',false)}"><DialogContent role="alertdialog" class="catalog-dialog unsaved-config-dialog"><DialogHeader><DialogTitle>配置有未保存修改</DialogTitle><DialogDescription>离开会放弃本次输入。</DialogDescription></DialogHeader><div class="config-form-footer"><Button variant="outline" @click="emit('settle',false)">继续编辑</Button><Button @click="emit('settle',true)">放弃修改并离开</Button></div></DialogContent></Dialog></template>
