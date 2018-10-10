public with sharing class ganttChart {
    @AuraEnabled(Cacheable=true)
    public static String getRecordType(Id recordId) {
        return recordId.getSobjectType().getDescribe().getName();
    }

    @AuraEnabled(Cacheable=true)
    public static List<Id> getResourceIds(Id recordId, Date startDate, Date endDate) {
        Set<Id> resourceIds = new Set<Id>();

        if (null == startDate) {
            startDate = Date.today();
        }

        if (null == endDate) {
            endDate = Date.today();
        }

        if (null == recordId) {
            for (Allocation__c allocation : [SELECT Resource__c
                                             FROM Allocation__c
                                             WHERE Start_Date__c <= :startDate
                                             AND End_Date__c >= :endDate]) {
                resourceIds.add(allocation.Resource__c);
            }
        } else {
            String recordType = ganttChart.getRecordType(recordId);

            switch on recordType {
                when 'Project__c' {
                    for (Allocation__c allocation : [SELECT Resource__c
                                             FROM Allocation__c
                                             WHERE Project__c = :recordId
                                             AND Start_Date__c <= :startDate
                                             AND End_Date__c >= :endDate]) {
                        resourceIds.add(allocation.Resource__c);
                    }
                }
                when 'Resource__c' {
                    resourceIds.add(recordId);
                }
                when else {
                    // do nothing
                }
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
    public static List<Object> getAllocationLists(Id recordId, Date startDate, Date endDate) {
        if (null == startDate) {
            startDate = Date.today();
        }

        if (null == endDate) {
            endDate = Date.today();
        }

        Map<String, Object> allocationsByProject = new Map<String, Object>();

        for (Allocation__c allocation : [SELECT Id, Start_Date__c, End_Date__c, Project__c
                                         FROM Allocation__c
                                         WHERE (Project__c = :recordId OR Resource__c = :recordId)
                                         AND Start_Date__c <= :startDate
                                         AND End_Date__c >= :endDate]) {
            if (!allocationsByProject.containsKey(allocation.Project__c)) {
                allocationsByProject.put(allocation.Project__c, new List<Allocation__c>());
            }

            ((List<Object>)allocationsByProject.get(allocation.Project__c)).add(allocation);
        }

        return allocationsByProject.values();
    }
}
