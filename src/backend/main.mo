import Text "mo:core/Text";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";



actor {
  include MixinStorage();

  // TYPES
  public type Customer = {
    id : Text;
    name : Text;
    email : Text;
    phone : Text;
    tags : [Text];
    isActive : Bool;
    notes : ?Text;
  };

  public type Address = {
    id : Text;
    customerId : Text;
    addressLabel : Text; // Changed from 'label' to 'addressLabel'
    street : Text;
    city : Text;
    state : Text;
    postalCode : Text;
    country : Text;
    isPrimary : Bool;
    notes : ?Text;
  };

  public type Service = {
    id : Text;
    name : Text;
    description : Text;
    price : Float;
    laborRate : Float;
    isActive : Bool;
    notes : ?Text;
  };

  public type InventoryItem = {
    id : Text;
    name : Text;
    description : Text;
    sku : Text;
    price : Float;
    stock : Nat;
    minStockLevel : Nat;
    isActive : Bool;
    notes : ?Text;
  };

  public type Job = {
    id : Text;
    customerId : Text;
    serviceId : Text;
    addressId : Text;
    startTime : Time.Time;
    endTime : Time.Time;
    status : Text;
    notes : ?Text;
    cost : Float;
    isActive : Bool;
  };

  public type TimeEntry = {
    id : Text;
    jobId : Text;
    serviceId : Text;
    customerId : Text;
    addressId : Text;
    startTime : Time.Time;
    endTime : Time.Time;
    description : Text;
    notes : ?Text;
    cost : Float;
  };

  public type TimeBlock = {
    id : Text;
    startTime : Time.Time;
    endTime : Time.Time;
    taskType : Text;
    customerId : ?Text;
    jobId : ?Text;
    description : Text;
    notes : ?Text;
    duration : Float;
    cost : Float;
  };

  public type MaterialEntry = {
    id : Text;
    jobId : Text;
    inventoryItemId : Text;
    quantity : Nat;
    cost : Float;
    notes : ?Text;
  };

  public type Invoice = {
    id : Text;
    customerId : Text;
    jobIds : [Text];
    timeEntryIds : [Text];
    timeBlockIds : [Text];
    materialEntryIds : [Text];
    dateIssued : Time.Time;
    dueDate : Time.Time;
    status : Text;
    totalAmount : Float;
    notes : ?Text;
  };

  public type Payment = {
    id : Text;
    invoiceId : Text;
    amount : Float;
    paymentMethod : Text;
    dateReceived : Time.Time;
    notes : ?Text;
  };

  public type Modifier = {
    id : Text;
    name : Text;
    modifierType : Text;
    value : Float;
    notes : ?Text;
  };

  public type Expense = {
    id : Text;
    description : Text;
    amount : Float;
    expenseType : Text;
    dateIncurred : Time.Time;
    notes : ?Text;
  };

  public type Settings = {
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

  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
    role : Text;
    isActive : Bool;
  };

  public type Visit = {
    id : Text;
    jobId : Text;
    scheduledDate : Time.Time;
    startTime : ?Time.Time;
    endTime : ?Time.Time;
    status : Text;
    notes : ?Text;
    internalNotes : ?Text;
    laborHours : Float;
    laborRate : Float;
    laborCost : Float;
    photoIds : [Text];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Storage (persistent via stable Maps)
  let customerMap = Map.empty<Text, Customer>();
  let addressMap = Map.empty<Text, Address>();
  let serviceMap = Map.empty<Text, Service>();
  let inventoryMap = Map.empty<Text, InventoryItem>();
  let jobMap = Map.empty<Text, Job>();
  let timeEntryMap = Map.empty<Text, TimeEntry>();
  let timeBlockMap = Map.empty<Text, TimeBlock>();
  let materialMap = Map.empty<Text, MaterialEntry>();
  let invoiceMap = Map.empty<Text, Invoice>();
  let paymentMap = Map.empty<Text, Payment>();
  let modifierMap = Map.empty<Text, Modifier>();
  let expenseMap = Map.empty<Text, Expense>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let fileReferences = Map.empty<Text, Storage.ExternalBlob>();
  let visitMap = Map.empty<Text, Visit>();

  var settings : Settings = {
    defaultLaborRate = 50.0;
    defaultTaxRate = 0.07;
    currency = "USD";
    invoicePrefix = "INV-";
    invoiceStartingNumber = 1000;
    paymentTermsDays = 30;
    companyName = "Example Landscaping";
    companyPhone = "123-456-7890";
    companyEmail = "info@example.com";
    companyAddress = "123 Main St, Testing City, US";
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Comparison function modules
  module Address {
    public func compare(a1 : Address, a2 : Address) : Order.Order {
      Text.compare(a1.id, a2.id);
    };
  };

  module Job {
    public func compare(j1 : Job, j2 : Job) : Order.Order {
      Text.compare(j1.id, j2.id);
    };
  };

  module Customer {
    public func compare(c1 : Customer, c2 : Customer) : Order.Order {
      Text.compare(c1.id, c2.id);
    };
  };

  // Helper function to get time boundaries
  func getTimeBoundaries() : (Time.Time, Time.Time) {
    let day : Int = 86_400_000_000_000; // Nanoseconds in a day
    let week : Int = day * 7;
    let now : Int = Time.now();
    let currentWeekStart : Int = now - (now % week);

    (currentWeekStart, currentWeekStart + week);
  };

  // User profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Customer CRUD
  public shared ({ caller }) func addCustomer(customer : Customer) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only admins or users can add customers");
    };
    customerMap.add(customer.id, customer);
  };

  public query ({ caller }) func getCustomer(id : Text) : async ?Customer {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view customers");
    };
    customerMap.get(id);
  };

  public query ({ caller }) func listActiveCustomers() : async [Customer] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list customers");
    };
    customerMap.values().toArray().filter(
      func(c) {
        c.isActive;
      }
    ).sort();
  };

  // Address CRUD
  public shared ({ caller }) func addAddress(address : Address) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only admins or users can add addresses");
    };
    addressMap.add(address.id, address);
  };

  public query ({ caller }) func getAddress(id : Text) : async ?Address {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view addresses");
    };
    addressMap.get(id);
  };

  public query ({ caller }) func listAddressesByCustomer(customerId : Text) : async [Address] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list addresses");
    };
    addressMap.values().toArray().filter(
      func(a) {
        a.customerId == customerId;
      }
    ).sort();
  };

  public query ({ caller }) func getActiveAddressesByCustomer(customerId : Text) : async [Address] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list addresses");
    };
    addressMap.values().toArray().filter(
      func(a) {
        a.customerId == customerId and a.isPrimary;
      }
    ).sort();
  };

  // Job CRUD
  public shared ({ caller }) func addJob(job : Job) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only admins or users can add jobs");
    };
    jobMap.add(job.id, job);
  };

  public query ({ caller }) func getJob(id : Text) : async ?Job {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view jobs");
    };
    jobMap.get(id);
  };

  public query ({ caller }) func getJobsByAddress(addressId : Text) : async [Job] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view jobs");
    };
    jobMap.values().toArray().filter(
      func(p) {
        p.addressId == addressId;
      }
    ).sort();
  };

  // Service CRUD
  public shared ({ caller }) func addService(service : Service) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only admins or users can add jobs");
    };
    serviceMap.add(service.id, service);
  };

  public query ({ caller }) func getJobServices(jobId : Text) : async [Service] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view jobs");
    };
    serviceMap.values().toArray();
  };

  // Invoice CRUD
  public shared ({ caller }) func addInvoice(invoice : Invoice) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only admins or users can add invoices");
    };
    invoiceMap.add(invoice.id, invoice);
  };

  public query ({ caller }) func getInvoicesByCustomer(customerId : Text) : async [Invoice] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view invoices");
    };
    invoiceMap.values().toArray().filter(
      func(i) {
        i.customerId == customerId;
      }
    );
  };

  // Settings queries/updates
  public query ({ caller }) func getSettings() : async Settings {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view settings");
    };
    settings;
  };

  public shared ({ caller }) func updateSettings(newSettings : Settings) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update settings");
    };
    settings := newSettings;
  };

  // Visit CRUD
  public shared ({ caller }) func addVisit(visit : Visit) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add visits");
    };
    visitMap.add(visit.id, visit);
  };

  public query ({ caller }) func getVisit(id : Text) : async ?Visit {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get visits");
    };
    visitMap.get(id);
  };

  public query ({ caller }) func listVisitsByJob(jobId : Text) : async [Visit] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list visits");
    };
    visitMap.values().toArray().filter(
      func(v) {
        v.jobId == jobId;
      }
    );
  };

  public shared ({ caller }) func updateVisit(visit : Visit) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update visits");
    };
    switch (visitMap.get(visit.id)) {
      case (null) { Runtime.trap("Visit does not exist: " # visit.id) };
      case (?_) { visitMap.add(visit.id, visit) };
    };
  };

  public shared ({ caller }) func updateJob(job : Job) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update jobs");
    };
    switch (jobMap.get(job.id)) {
      case (null) { Runtime.trap("Job not found: " # job.id) };
      case (?_) { jobMap.add(job.id, job) };
    };
  };

  //----------------------
  // SEED DATA
  //----------------------

  public shared ({ caller }) func loadSeedData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can load seed data");
    };

    let customer1 : Customer = {
      id = "CUST1";
      name = "John Doe";
      email = "john@doe.com";
      phone = "1234567890";
      tags = ["VIP"];
      isActive = true;
      notes = ?("Regular customer, prefers morning appointments");
    };

    let address1 : Address = {
      id = "ADDR1";
      customerId = "CUST1";
      addressLabel = "Home";
      street = "123 Main St";
      city = "Test City";
      state = "TC";
      postalCode = "12345";
      country = "US";
      isPrimary = true;
      notes = null;
    };

    customerMap.add(customer1.id, customer1);
    addressMap.add(address1.id, address1);
    settings := {
      defaultLaborRate = 60.0;
      defaultTaxRate = 0.08;
      currency = "USD";
      invoicePrefix = "INV-";
      invoiceStartingNumber = 1001;
      paymentTermsDays = 30;
      companyName = "Testing Landscaping";
      companyPhone = "123-456-7890";
      companyEmail = "test@test.com";
      companyAddress = "345 Testing Blvd, Test City, US";
    };
  };
};
