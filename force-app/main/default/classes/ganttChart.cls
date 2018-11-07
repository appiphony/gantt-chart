public with sharing class ganttChart {
    @AuraEnabled(Cacheable=true)
    public static Map<String, Object> getChartData(String recordId, String startDate, String endDate) {
        Map<String, Object> data = new Map<String, Object>();
        Map<String, Object> resourceById = new Map<String, Object>();

        List<Allocation__c> allocations = new List<Allocation__c>();

        if (String.isEmpty(recordId)) {
            allocations = [SELECT Resource__c, Resource__r.Name, Resource__r.Active__c, Resource__r.Default_Role__c,
                                  Project__c, Project__r.Name, Project__r.Active__c, Project__r.Color__c,
                                  Start_Date__c, End_Date__c, Role__c, Status__c, Effort__c
                           FROM Allocation__c
                           WHERE Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                           AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()
                           ORDER BY Resource__r.Name, Project__r.Name, Start_Date__c];
        } else {
            if ('Project__c' == Id.valueOf(recordId).getSobjectType().getDescribe().getName()) {
                data.put('projectId', recordId);
            }
            
            allocations = [SELECT Resource__c, Resource__r.Name, Resource__r.Active__c, Resource__r.Default_Role__c,
                                  Project__c, Project__r.Name, Project__r.Active__c, Project__r.Color__c,
                                  Start_Date__c, End_Date__c, Role__c, Status__c, Effort__c
                           FROM Allocation__c
                           WHERE (Project__c = :recordId OR Resource__c = :recordId)
                           AND Start_Date__c <= :DateTime.newInstance(Long.valueOf(endDate)).date()
                           AND End_Date__c >= :DateTime.newInstance(Long.valueOf(startDate)).date()
                           ORDER BY Resource__r.Name, Project__r.Name, Start_Date__c];

            // empty state on resource page
            if (allocations.isEmpty() && 'Resource__c' == Id.valueOf(recordId).getSobjectType().getDescribe().getName()) {
                Resource__c resource = [SELECT Id, Name, Active__c, Default_Role__c
                                        FROM Resource__c
                                        WHERE Id = :recordId];

                resourceById.put(resource.Id, new Map<String, Object> {
                    'Id' => resource.Id,
                    'Name' => resource.Name,
                    'Default_Role__c' => resource.Default_Role__c,
                    'primaryAllocation' => null,
                    'allocationsByProject' => new Map<String, Object>()
                });
            }
        }

        for (Allocation__c allocation : allocations) {
            if (!resourceById.containsKey(allocation.Resource__c)) {
                resourceById.put(allocation.Resource__c, new Map<String, Object> {
                    'Id' => allocation.Resource__c,
                    'Name' => allocation.Resource__r.Name,
                    'Default_Role__c' => allocation.Resource__r.Default_Role__c,
                    'primaryAllocation' => allocation,
                    'allocationsByProject' => new Map<String, Object>()
                });
            }

            Map<String, Object> resource = (Map<String, Object>)resourceById.get(allocation.Resource__c);
            Allocation__c primaryAllocation = getPrimaryAllocation((Allocation__c)resource.get('primaryAllocation'), allocation);
            Map<String, Object> allocationsByProject = (Map<String, Object>)resource.get('allocationsByProject');
            
            resource.put('primaryAllocation', primaryAllocation);
            
            if (!allocationsByProject.containsKey(allocation.Project__c)) {
                allocationsByProject.put(allocation.Project__c, new List<Object>());
            }

            List<Object> projectAllocation = (List<Object>)allocationsByProject.get(allocation.Project__c);
            projectAllocation.add(allocation);
        }
        
        data.put('resources', resourceById.values());
        
        return data;
    }

    @AuraEnabled(Cacheable=true)
    public static List<Resource__c> getResources() {
        return [SELECT Id, Name, Default_Role__c
                FROM Resource__c
                WHERE Active__c = true];
    }

    @AuraEnabled(Cacheable=true)
    public static List<Project__c> getProjects() {
        return [SELECT Id, Name, Color__c
                FROM Project__c
                WHERE Active__c = true];
    }

    @AuraEnabled(Cacheable=true)
    public static Object saveAllocation(Id allocationId, Id projectId, Id resourceId, String role, String startDate, String endDate) {
        Allocation__c allocation = new Allocation__c(
            Role__c = role,
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

        return allocation;
    }

    @AuraEnabled(Cacheable=true)
    public static void deleteAllocation(Id allocationId) {
        delete new Allocation__c(Id = allocationId);
    }

    private static Allocation__c getPrimaryAllocation(Allocation__c a, Allocation__c b) {
        // if a is active today
        if (Date.today() >= a.Start_Date__c && Date.today() <= a.End_Date__c) {
            // if b is NOT active today
            if (Date.today() < b.Start_Date__c || Date.today() > b.End_Date__c) {
                return a;
            }
            else {
                // if b ends before a
                if (b.End_Date__c < a.End_Date__c) {
                    return b;
                } else {
                    return a;
                }
            }
        }
        // if a is active in the future
        else if (Date.today() < a.Start_Date__c) {
            // if b is active in the past
            if (Date.today() > b.Start_Date__c) {
                return a;
            } else {
                // if b starts before a
                if (b.Start_Date__c < a.Start_Date__c) {
                    return b;
                } else {
                    return a;
                }
            }
        }
        // if a is active in the past
        else {
            // if b is active in the future
            if (Date.today() < b.Start_Date__c) {
                return b;
            } else {
                // if b ends before a
                if (b.End_Date__c > a.End_Date__c) {
                    return b;
                } else {
                    return a;
                }
            }
        }
    }
}
