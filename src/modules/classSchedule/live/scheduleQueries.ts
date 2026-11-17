import type {QuerySpec} from '../../staff/desk/useCos';
/** Every offset-paged schedule/export lookup ends in a unique id, including tied occurrence timestamps. */
export function scheduleQueries(from:string,until:string):Record<'schedules'|'resources'|'coaches'|'occurrences',QuerySpec>{return {
 schedules:{entity:'schedule',sort:[{field:'weekday',dir:'asc'},{field:'start_time',dir:'asc'},{field:'id',dir:'asc'}]},
 resources:{entity:'resource',filter:{field:'kind',op:'eq',value:'room'},sort:[{field:'name',dir:'asc'},{field:'id',dir:'asc'}]},
 coaches:{entity:'coach',include:[{field:'person',fields:['name','email','phone']}],sort:[{field:'id',dir:'asc'}]} as QuerySpec,
 occurrences:{entity:'occurrence',filter:{and:[{field:'starts_at',op:'gte',value:from},{field:'starts_at',op:'lt',value:until}]},sort:[{field:'starts_at',dir:'asc'},{field:'id',dir:'asc'}]},
};}
