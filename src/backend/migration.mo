import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

module {
  type OldExpense = {
    id : Text;
    description : Text;
    amount : Float;
    expenseType : Text;
    dateIncurred : Time.Time;
    notes : ?Text;
  };

  type OldActor = {
    customerMap : Map.Map<Text, { id : Text; name : Text; email : Text; phone : Text; tags : [Text]; isActive : Bool; notes : ?Text }>;
    addressMap : Map.Map<Text, { id : Text; customerId : Text; addressLabel : Text; street : Text; city : Text; state : Text; postalCode : Text; country : Text; isPrimary : Bool; notes : ?Text }>;
    serviceMap : Map.Map<Text, { id : Text; name : Text; description : Text; price : Float; laborRate : Float; isActive : Bool; notes : ?Text }>;
    inventoryMap : Map.Map<Text, { id : Text; name : Text; description : Text; sku : Text; price : Float; stock : Nat; minStockLevel : Nat; isActive : Bool; notes : ?Text }>;
    jobMap : Map.Map<Text, { id : Text; customerId : Text; serviceId : Text; addressId : Text; startTime : Time.Time; endTime : Time.Time; status : Text; notes : ?Text; cost : Float; isActive : Bool }>;
    timeEntryMap : Map.Map<Text, { id : Text; jobId : Text; serviceId : Text; customerId : Text; addressId : Text; startTime : Time.Time; endTime : Time.Time; description : Text; notes : ?Text; cost : Float }>;
    timeBlockMap : Map.Map<Text, { id : Text; startTime : Time.Time; endTime : Time.Time; taskType : Text; customerId : ?Text; jobId : ?Text; description : Text; notes : ?Text; duration : Float; cost : Float }>;
    materialMap : Map.Map<Text, { id : Text; jobId : Text; inventoryItemId : Text; quantity : Nat; cost : Float; notes : ?Text }>;
    invoiceMap : Map.Map<Text, { id : Text; customerId : Text; jobIds : [Text]; timeEntryIds : [Text]; timeBlockIds : [Text]; materialEntryIds : [Text]; dateIssued : Time.Time; dueDate : Time.Time; status : Text; totalAmount : Float; notes : ?Text }>;
    paymentMap : Map.Map<Text, { id : Text; invoiceId : Text; amount : Float; paymentMethod : Text; dateReceived : Time.Time; notes : ?Text }>;
    modifierMap : Map.Map<Text, { id : Text; name : Text; modifierType : Text; value : Float; notes : ?Text }>;
    expenseMap : Map.Map<Text, OldExpense>; // Old expenseMap
    userProfiles : Map.Map<Principal, { name : Text; email : Text; phone : Text; role : Text; isActive : Bool }>;
    fileReferences : Map.Map<Text, Storage.ExternalBlob>;
    visitMap : Map.Map<Text, { id : Text; jobId : Text; scheduledDate : Time.Time; startTime : ?Time.Time; endTime : ?Time.Time; status : Text; notes : ?Text; internalNotes : ?Text; laborHours : Float; laborRate : Float; laborCost : Float; photoIds : [Text]; createdAt : Time.Time; updatedAt : Time.Time }>;
    settings : {
      defaultLaborRate : Float;
      defaultTaxRate : Float;
      currency : Text;
      invoicePrefix : Text;
      invoiceStartingNumber : Nat;
      paymentTermsDays : Nat;
      companyName : Text;
      companyPhone : Text;
      companyEmail : Text;
      companyAddress : Text;
    };
    accessControlState : AccessControl.AccessControlState;
  };

  type NewExpense = {
    id : Text;
    description : Text;
    amount : Float;
    expenseType : Text;
    dateIncurred : Time.Time;
    notes : ?Text;
    jobId : ?Text;
    visitId : ?Text;
    vendorName : ?Text;
    receiptBlobId : ?Text;
  };

  type NewActor = {
    customerMap : Map.Map<Text, { id : Text; name : Text; email : Text; phone : Text; tags : [Text]; isActive : Bool; notes : ?Text }>;
    addressMap : Map.Map<Text, { id : Text; customerId : Text; addressLabel : Text; street : Text; city : Text; state : Text; postalCode : Text; country : Text; isPrimary : Bool; notes : ?Text }>;
    serviceMap : Map.Map<Text, { id : Text; name : Text; description : Text; price : Float; laborRate : Float; isActive : Bool; notes : ?Text }>;
    inventoryMap : Map.Map<Text, { id : Text; name : Text; description : Text; sku : Text; price : Float; stock : Nat; minStockLevel : Nat; isActive : Bool; notes : ?Text }>;
    jobMap : Map.Map<Text, { id : Text; customerId : Text; serviceId : Text; addressId : Text; startTime : Time.Time; endTime : Time.Time; status : Text; notes : ?Text; cost : Float; isActive : Bool }>;
    timeEntryMap : Map.Map<Text, { id : Text; jobId : Text; serviceId : Text; customerId : Text; addressId : Text; startTime : Time.Time; endTime : Time.Time; description : Text; notes : ?Text; cost : Float }>;
    timeBlockMap : Map.Map<Text, { id : Text; startTime : Time.Time; endTime : Time.Time; taskType : Text; customerId : ?Text; jobId : ?Text; description : Text; notes : ?Text; duration : Float; cost : Float }>;
    materialMap : Map.Map<Text, { id : Text; jobId : Text; inventoryItemId : Text; quantity : Nat; cost : Float; notes : ?Text }>;
    invoiceMap : Map.Map<Text, { id : Text; customerId : Text; jobIds : [Text]; timeEntryIds : [Text]; timeBlockIds : [Text]; materialEntryIds : [Text]; dateIssued : Time.Time; dueDate : Time.Time; status : Text; totalAmount : Float; notes : ?Text }>;
    paymentMap : Map.Map<Text, { id : Text; invoiceId : Text; amount : Float; paymentMethod : Text; dateReceived : Time.Time; notes : ?Text }>;
    modifierMap : Map.Map<Text, { id : Text; name : Text; modifierType : Text; value : Float; notes : ?Text }>;
    expenseMap : Map.Map<Text, NewExpense>; // New expenseMap with extended fields
    userProfiles : Map.Map<Principal, { name : Text; email : Text; phone : Text; role : Text; isActive : Bool }>;
    fileReferences : Map.Map<Text, Storage.ExternalBlob>;
    visitMap : Map.Map<Text, { id : Text; jobId : Text; scheduledDate : Time.Time; startTime : ?Time.Time; endTime : ?Time.Time; status : Text; notes : ?Text; internalNotes : ?Text; laborHours : Float; laborRate : Float; laborCost : Float; photoIds : [Text]; createdAt : Time.Time; updatedAt : Time.Time }>;
    settings : {
      defaultLaborRate : Float;
      defaultTaxRate : Float;
      currency : Text;
      invoicePrefix : Text;
      invoiceStartingNumber : Nat;
      paymentTermsDays : Nat;
      companyName : Text;
      companyPhone : Text;
      companyEmail : Text;
      companyAddress : Text;
    };
    accessControlState : AccessControl.AccessControlState;
  };

  public func run(old : OldActor) : NewActor {
    let newExpenseMap = old.expenseMap.map<Text, OldExpense, NewExpense>(
      func(_id, oldExpense) {
        {
          oldExpense with
          jobId = null; // Default to null for old records
          visitId = null;
          vendorName = null;
          receiptBlobId = null;
        };
      }
    );
    { old with expenseMap = newExpenseMap };
  };
};
