# Roam CRM

Roam CRM turns your graph into a _Relationship Management_ tool. Inspired by [Sivers](https://sive.rs/hundreds), and David Rockefeller's collection of [200,000 index cards](https://archive.is/zxbCA), Roam CRM keeps people and dates important to you top of mind.

## Setup

Roam CRM is built on top of several Roam extensions. Please install them on Roam Depot:

-   [Google](https://github.com/dvargas92495/roamjs-google) by David Vargas

    1. Install Google extension
    2. You can now automatically pull events into Daily Note, create new people from events

-   [Workbench](https://github.com/dvargas92495/roamjs-workbench) by David Vargas

    1. Install Workbench extension and enable the `Attribute Select` feature
    2. Navigate to the newly created page in your graph `[[roam/js/attribute-select]]`
    3. Add the attribute `Contact Frequency`
    4. Add these five options
        - `#[[A List]]`: Contact every two weeks
        - `#[[B List]]`: Contact every two months
        - `#[[C List]]`: Contact every six months
        - `#[[D List]]`: Contact once a year
        - `#[[F List]]`: Never contact

-   [Query Builder](https://github.com/dvargas92495/roamjs-query-builder) by David Vargas

    1. Install Query Builder extension
    2. Custom queries are automatically created

### Agenda Addr

Inefficient leaders waste a lot of time reaching out about or responding to one-off issues in real time. A much more efficient method is to batch your issues and discuss them all at once.

-   Make a block anywhere that has as persons name `[[Bill Gates]]` and a hashtag `#Agenda`
-   Roam CRM will automatically nest your block on Bill's page under an agenda attribute
-   Use a hashtag to have the extension hide the name in the Agenda, e.g. `#[[Bill Gates]]` 
-   Next time you talk, you'll remember everything you wanted to tell Bill

### Metadata

-   Roam CRM creates metadata for each `#people` page inspired by [Matt Mochary](https://docs.google.com/spreadsheets/d/1Ti_xaV9IVvj-bklxOjNY-IeGsC-YqcgvB03qvfFQrnI/)

### Contact Reminders

Set contact frequency reminders for each person. This can be customized in the settings. A modal will pop up reminding you to contact them.

- `#[[A List]]`: Contact every two weeks 
- `#[[B List]]`: Contact every two months 
- `#[[C List]]`: Contact every six months 
- `#[[D List]]`: Contact once a year 
- `#[[F List]]`: Never contact

### Birthday Reminders

-   Birthday reminders happen 14 days before, and on day of. They remind you 'Bill Gates turned 46 today.'

### Hotkeys

- Roam CRM adds quality of life hotkeys for interacting with the right sidebar
- Configure hotkeys in settings

## Example

<img src="LINK_TO_IMAGE" max-width="400"></img>
