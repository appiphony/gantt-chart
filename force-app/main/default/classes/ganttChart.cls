public with sharing class ganttChart {
    @AuraEnabled(Cacheable=true)
    public static Map<String, Object> getChartData(String recordId, String startDate, String endDate) {
        Map<String, Object> data = new Map<String, Object>();
        Map<String, Object> resourceById = new Map<String, Object>();

        List<Allocation__c> allocations;

        if (String.isEmpty(recordId)) {
            allocations = [SELECT Resource__c, Resource__r.Name, Resource__r.Default_Role__c
                          FROM Allocation__c
                          WHERE Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                          AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()];
        } else if ('Project__c' == Id.valueOf(recordId).getSobjectType().getDescribe().getName()) {
            data.put('projectId', recordId);
            allocations = [SELECT Resource__c, Resource__r.Name, Resource__r.Default_Role__c
                           FROM Allocation__c
                           WHERE Project__c = :recordId
                           AND Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                           AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()];
        } else {
            allocations = [SELECT Resource__c, Resource__r.Name, Resource__r.Default_Role__c
                           FROM Allocation__c
                           WHERE Resource__c = :recordId
                           AND Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                           AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()];
        }

        for (Allocation__c allocation : allocations) {
            resourceById.put(allocation.Resource__c, new Map<String, Object> {
                'Id' => allocation.Resource__c,
                'Name' => allocation.Resource__r.Name,
                'Default_Role__c' => allocation.Resource__r.Default_Role__c
            });
        }
        data.put('resources', resourceById.values());
        
        return data;
    }

    @AuraEnabled(Cacheable=true)
    public static List<Object> getAllocationLists(Id recordId, String projectId, String startDate, String endDate) {
        Map<String, Object> allocationsByProject = new Map<String, Object>();
        List<Allocation__c> allocations = new List<Allocation__c>();

        if (String.isEmpty(projectId)) {
            allocations = [SELECT Id, Start_Date__c, End_Date__c, Project__c, Project__r.Name
                           FROM Allocation__c
                           WHERE Resource__c = :recordId
                           AND Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                           AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()];
        } else {
            allocations = [SELECT Id, Start_Date__c, End_Date__c, Project__c, Project__r.Name
                           FROM Allocation__c
                           WHERE Resource__c = :recordId
                           AND Project__c = :Id.valueOf(projectId)
                           AND Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                           AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()];
        }
        
        for (Allocation__c allocation : allocations) {
            if (!allocationsByProject.containsKey(allocation.Project__c)) {
                allocationsByProject.put(allocation.Project__c, new List<Allocation__c>());
            }

            ((List<Object>)allocationsByProject.get(allocation.Project__c)).add(allocation);
        }

        return allocationsByProject.values();
    }

    @AuraEnabled(Cacheable=true)
    public static List<Resource__c> getResources() {
        return [SELECT Id, Name, Default_Role__c
                FROM Resource__c
                WHERE Active__c = true];
    }

    @AuraEnabled
    public static void saveAllocation(Id allocationId, Id projectId, Id resourceId, String startDate, String endDate) {
        Allocation__c allocation = new Allocation__c(
            Start_Date__c = DateTime.newInstance(Long.valueOf(startDate)).date(),
            End_Date__c = DateTime.newInstance(Long.valueOf(endDate)).date()
        );

        if (null != allocationId) {
            allocation.Id = allocationId;
        } else {
            if (null != projectId) {
                allocation.Project__c = projectId;
            }

            if (null != resourceId) {
                allocation.Resource__c = resourceId;
            }
        }

        upsert allocation;
    }
}
