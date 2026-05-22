# Knowledge Plane — Glossary

_Generated from `knowledge_plane.motly` + 1 Malloy model(s). Do not edit by hand._

## Entities

### Calendar Date  `kp:CalendarDate`

A single calendar day, used as the temporal anchor for transactions and reporting periods.

*Steward:* Finance  
*Appears in models:* sales  

### Currency Exchange Rate  `kp:CurrencyExchangeRate`

The daily rate for converting an amount from one currency into a reporting currency.

*Steward:* Finance  
*Appears in models:* sales  

### Customer  `kp:Customer`

A natural or legal person who buys products from the company.

*Steward:* Sales  
*Appears in models:* sales  

### Order  `kp:Order`

A purchase transaction placed by a customer at a store on a given date, composed of one or more order lines.

*Steward:* Sales  
*Appears in models:* sales  

### Order Line  `kp:OrderLine`

A single line on an order, recording one product, its quantity and the prices applied at sale time.

*Steward:* Sales  
*Appears in models:* sales  

### Product  `kp:Product`

A sellable item offered to customers, identified by a stable product key.

*Steward:* Merchandising  
*Appears in models:* sales  

### Store  `kp:Store`

A physical or online point of sale where orders are placed.

*Steward:* Retail Operations  
*Appears in models:* sales  

## Defined Classes

### Active Customer  `kp:ActiveCustomer`

A customer with at least one order in the last 2 years.

*Steward:* Sales  
*Subtype of:* `kp:Customer`  
*Membership rule:* `made_an_order count > 0 within last 2 years`  
*Appears in models:* sales  

## Measures

### Line Cost  `kp:LineCost`

Cost of goods sold for one order line: quantity times unit cost.

*Appears in models:* sales  

### Line Revenue  `kp:LineRevenue`

Gross revenue for one order line: quantity times net price.

*Appears in models:* sales  

### Margin  `kp:Margin`

Gross margin: total sales minus total cost.

*Appears in models:* sales  

### Margin Percent  `kp:MarginPercent`

Gross margin expressed as a ratio of total sales.

*Appears in models:* sales  

### Order Count  `kp:OrderCount`

Number of distinct orders in scope.

*Appears in models:* sales  

### Total Cost  `kp:TotalCost`

Sum of line cost across all order lines in scope.

*Appears in models:* sales  

### Total Sales  `kp:TotalSales`

Sum of line revenue across all order lines in scope.

*Appears in models:* sales  

## Attributes

### Customer Age  `kp:CustomerAge`

Age of the customer in years.

*Appears in models:* sales  

### Customer City  `kp:CustomerCity`

City of residence of the customer.

*Appears in models:* sales  

### Customer Country  `kp:CustomerCountry`

Country of residence of the customer.

*Appears in models:* sales  

### Customer Gender  `kp:CustomerGender`

Gender of the customer.

*Appears in models:* sales  

### Customer Occupation  `kp:CustomerOccupation`

Stated occupation of the customer.

*Appears in models:* sales  

### Line Quantity  `kp:LineQuantity`

Number of product units on the order line.

*Appears in models:* sales  

### Order Date  `kp:OrderDate`

The calendar date on which the order was placed.

*Appears in models:* sales  

### Product Brand  `kp:ProductBrand`

Brand under which the product is sold.

*Appears in models:* sales  

### Product Category  `kp:ProductCategory`

Top-level merchandising category of the product.

*Appears in models:* sales  

### Product Unit Cost  `kp:ProductUnitCost`

Cost to the company of one unit of the product.

*Appears in models:* sales  

### Product Unit Price  `kp:ProductUnitPrice`

List selling price of one unit of the product.

*Appears in models:* sales  

### Store Country  `kp:StoreCountry`

Country in which the store operates.

*Appears in models:* sales  

## Relationships

- **consists of** `kp:consistsOf` — `kp:Order` → `kp:OrderLine`
- **is placed at** `kp:isPlacedAt` — `kp:Order` → `kp:Store`
- **is placed by** `kp:isPlacedBy` — `kp:Order` → `kp:Customer`
- **occurs on** `kp:occursOn` — `kp:Order` → `kp:CalendarDate`
- **records sale of** `kp:recordsSaleOf` — `kp:OrderLine` → `kp:Product`

## Validator — public fields without a concept

- `sales/calendar_date`: Date, DayofWeek, DayofWeekNumber, DayofWeekShort, Month, MonthNumber, MonthShort, Quarter, WorkingDay, WorkingDayNumber, Year, YearMonth, YearMonthNumber, YearMonthShort, YearQuarter, YearQuarterNumber
- `sales/currency_exchange_rate`: Exchange
- `sales/customer`: CustomerKey, Birthday, Company, Continent, CountryFull, EndDT, GivenName, Latitude, Longitude, MiddleInitial, StartDT, State, StateFull, StreetAddress, Surname, Title, Vehicle, ZipCode
- `sales/order`: DeliveryDate, CustomerKey
- `sales/order_line`: NetPrice, UnitCost
- `sales/product`: Color, Manufacturer, ProductCode, ProductName, SubCategoryName, Weight, WeightUnit
- `sales/store`: CloseDate, CountryCode, Description, OpenDate, SquareMeters, State, Status, StoreCode
