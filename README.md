# Roam CRM

Roam CRM turns your graph into a _Relationship Management_ tool. Inspired by [Sivers](https://sive.rs/hundreds), and David Rockefeller's collection of [200,000 index cards](https://archive.is/zxbCA), Roam CRM keeps people and dates important to you top of mind.

## Usage Example

<img src="LINK_TO_IMAGE" max-width="400"></img>

> **NOTE**  
> There are certain tags and templates that Roam CRM relies on; **Tags:: #people** and **#Agenda** are the most vital. While these are not currently customizable they may be in the future.

## Setup

Roam CRM is built on top of several Roam extensions. Please install them on Roam Depot:

-   [Google](https://github.com/dvargas92495/roamjs-google) by David Vargas

    1. Install Google extension from Roam Depot
    2. Add your google accounts by following the extension's README
    3. You can now automatically pull events into Daily Note

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
    5. This is for convenience when switching a person's contact frequency. These durations are customizable in the Roam CRM settings.

-   [Query Builder](https://github.com/dvargas92495/roamjs-query-builder) by David Vargas

    1. Install Query Builder extension
    2. Import Call Rollup Queries from

## Features

### Agenda Addr

Inefficient leaders waste a lot of time reaching out about or responding to one-off issues in real time. A much more efficient method is to batch your issues and discuss them all at once.

-   Make a block anywhere that has as persons name `[[Bill Gates]]` and a hashtag `#Agenda`
-   Roam CRM will automatically nest a block ref on Bill's page under an agenda attribute
-   Use a hashtag to have the extension hide the name in the Agenda, e.g. `#[[Bill Gates]]`
-   Next time you talk, you'll remember everything you wanted to tell Bill

### Metadata

-   Roam CRM creates metadata for each `Tags::#people` page inspired by [Matt Mochary](https://docs.google.com/spreadsheets/d/1Ti_xaV9IVvj-bklxOjNY-IeGsC-YqcgvB03qvfFQrnI/). This metadata and its structure is important, **without this structure Roam CRM will not work.**
-   Each person page must have metadata that looks like this. You can use the **Person Metadata Template** button in the Roam CRM settings to import a quick Roam template for this metadata structure
    <img src="https://github.com/8bitgentleman/roam-depot-CRM-testing/raw/main/images/metadata.png" width="300"></img>
      <!-- FIXME UPDATE IMAGE PATH -->
-   At the bare minimum a person must have this metadata for it to be recoginzed by Roam CRM
    <img src="https://github.com/8bitgentleman/roam-depot-CRM-testing/raw/main/images/metadataMinimum.png" width="300"></img>

### Contact Reminders

Set contact frequency reminders for each person. This can be customized in the settings. A modal will pop up reminding you to contact them.

-   `#[[A List]]`: Contact every two weeks
-   `#[[B List]]`: Contact every two months
-   `#[[C List]]`: Contact every six months
-   `#[[D List]]`: Contact once a year
-   `#[[F List]]`: Never contact

Within the modal you can type a quick message to each person to stay in flow. This message will be nested on their page for future reference.

-   <img src="https://github.com/8bitgentleman/roam-depot-CRM-testing/raw/main/images/modal%20message.png" width="300"></img>

### Birthday Reminders

-   Birthday reminders happen 14 days before, and on day of. They remind you that 'Bill Gates turned 46 today.' A and B listers birthday reminders show up in the modal 14 & 7 days before as well as on the day of.
    -   <img src="https://github.com/8bitgentleman/roam-depot-CRM-testing/raw/main/images/modal%20birthdays.png" width="300"></img>
-   C and B lister birthdays only show up on the day-of as a block ref on the DNP
    -   <img src="https://github.com/8bitgentleman/roam-depot-CRM-testing/raw/main/images/birthdayRef.png" width="300"></img>

### Hotkeys

-   Roam CRM adds quality of life hotkeys for interacting with the right sidebar
-   Configure hotkeys in settings
