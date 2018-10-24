public with sharing class ganttChart {
    @AuraEnabled(Cacheable=true)
    public static String getRecordType(Id recordId) {
        return recordId.getSobjectType().getDescribe().getName();
    }

    @AuraEnabled(Cacheable=true)
    public static List<Id> getResourceIds(Id recordId, Date startDate, Integer days) {
        System.debug(days);
        Set<Id> resourceIds = new Set<Id>();

        // workaround for bug W-4320896
        days = Integer.valueOf(days);
        
        if (null == days) {
            days = 14;
        }

        if (null == startDate) {
           startDate = Date.today();
        }

        Date endDate = Date.newInstance(startDate.year(), startDate.month(), startDate.day()).addDays(days);

        if (null == recordId) {
            for (Allocation__c allocation : [SELECT Resource__c
                                             FROM Allocation__c
                                             WHERE Start_Date__c <= :endDate
                                             AND End_Date__c >= :startDate]) {
                resourceIds.add(allocation.Resource__c);
            }
        } else {
            for (Allocation__c allocation : [SELECT Resource__c
                                             FROM Allocation__c
                                             WHERE Project__c = :recordId
                                             AND Start_Date__c <= :endDate
                                             AND End_Date__c >= :startDate]) {
                resourceIds.add(allocation.Resource__c);
            }
        }

        return new List<Id>(resourceIds);
    }

    @AuraEnabled(Cacheable=true)
    public static Resource__c getResource(Id recordId) {
        return [SELECT Id, Name
                FROM Resource__c
                WHERE Id =:recordId];
    }

    @AuraEnabled(Cacheable=true)
    public static List<Object> getAllocationLists(Id recordId, Date startDate, Integer days) {
        if (null == days) {
            days = 14;
        }
        
        if (null == startDate) {
            startDate = Date.today();
        }

        Date endDate = Date.newInstance(startDate.year(), startDate.month(), startDate.day()).addDays(days);

        Map<String, Object> allocationsByProject = new Map<String, Object>();

        for (Allocation__c allocation : [SELECT Id, Name, Start_Date__c, End_Date__c, Project__c
                                         FROM Allocation__c
                                         WHERE (Project__c = :recordId OR Resource__c = :recordId)
                                         AND Start_Date__c <= :endDate
                                         AND End_Date__c >= :startDate]) {
            if (!allocationsByProject.containsKey(allocation.Project__c)) {
                allocationsByProject.put(allocation.Project__c, new List<Allocation__c>());
            }

            ((List<Object>)allocationsByProject.get(allocation.Project__c)).add(allocation);
        }

        return allocationsByProject.values();
    }

    @AuraEnabled(Cacheable=true)
    public static List<Resource__c> getResources() {
        return [SELECT Id, Name
                FROM Resource__c
                WHERE Active__c = true];
    }

    @AuraEnabled
    public static void saveAllocation(Id allocationId, String startDate, String endDate) {
        System.debug(startDate);
        System.debug(endDate);
        // Allocation__c allocation = new Allocation__c(
        //     Start_Date__c = startDate,
        //     End_Date__c = endDate
        // );

        // if (null != allocationId) {
        //     allocation.Id = allocationId;
        // } else {
        //     allocation.Name = 'New';
        // }

        // upsert allocation;
    }
}
