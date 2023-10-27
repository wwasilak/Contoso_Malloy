Mini project #2  : learning Malloy language using Contoso database (extracted to parquet files).


Contoso database is available thanks to the team from https://www.sqlbi.com/

Article explaining the whole concept: https://www.sqlbi.com/blog/marco/2022/06/06/creating-your-own-contoso-star-schema-database/

Link to GitHub repo with database generator: https://github.com/sql-bi/Contoso-Data-Generator

Downloadable versions: https://github.com/sql-bi/Contoso-Data-Generator/releases/tag/v1.0.0



I've rebuilt 1M version of this database in SQL Server and then extracted the data into parquet files (gzip) using Pandas and SQLAlchemy.


I would like to just plainly use the language and become proficient in concepts like nesting, metrics, dimensions etc. Also would like to try implement patterns from Malloy docs:
https://malloydata.github.io/documentation/patterns/yoy

Not yet sure what will be the output format of my tries - i am thinking about creating data model in form of .malloy file and multiple notebooks with patterns in form of .malloynb. Notebooks can be accessed using browser version of Vscode on .malloynb or .malloysql file (enter the file and press '.' on your keyboard).


The source to learn about Malloy language:
https://malloydata.github.io/documentation/

I highly advise to visit Slack channel where Malloy's creators quickly answer all questions:
https://join.slack.com/t/malloy-community/shared_invite/zt-1kgfwgi5g-CrsdaRqs81QY67QW0~t_uw

My first project using Malloy: https://github.com/wwasilak/northwind_test
