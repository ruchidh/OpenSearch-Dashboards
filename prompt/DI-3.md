Data importer Design Review

Feature Information Internal Document Link
Feature Title (guidelines) Data Importer GitHub RFC/Feature Request #1791, #1747, and #287
Feature Team Composition
Feature Lead - Feature Owner Ruchi Sharma High level design, API Documentation, mocks, prototypes, etc.
SDM Ashwin Pc Launch Manager Entry
UXD(s) Mocks link

Requirement doc - Data Importer Enhancement

1. Background: Current State(UI)

Current Limitations

- Data importer is buried in data administration.
- Limited accessibility across the application.
- Inefficient handling of large datasets.
- No support for GROQ parsing .
- Limited file format support (csv, json, ndjson).
- Missing delete functionality.
- Problematic log indices handling.
- Preview Table can’t handle large column size.
- No upload progress tracking.
- Mapping field errors ui is not built.

Customer Feedback (Fidelity)

1. Need to handle 50-60k records efficiently.
2. UX improvements required for large data with columns and rows.
3. Better field type mapping visualization.
4. Issues with log indices management.
5. Need for secure deletion features.

6. Enhanced Requirements

Functional Requirements

1. Data Processing Capabilities

- Support for 60k+ records (max, we can try up to 100k).
- Multiple file format support along with json/ndjson, some of them are -

1. XML: Directly convertible to JSON. There are established algorithms for this conversion.
2. CSV: Directly convertible to JSON, easy mapping to json,
3. SQL dump files: Can be parsed and converted to JSON, but the structure might need to be flattened or nested appropriately.
4. HAR Log files, which can be parsed with groq pattern command. WE can directly import them as JSON and query with GROQ.
5. For plain text log files, we'd typically need to parse them into a structured format first. Once parsed into a structured format (like JSON), we can use GROQ to query the data.

   Note: When converting to JSON, we have to keep in mind:

6.
7. Data types might not map perfectly (e.g., dates might become strings).
8. We may lose some metadata or structure information in the conversion process.
9. For large files, we might need to process the conversion in chunks to manage memory usage.
10. Provide predefined GROQ queries for common log analysis tasks, but also allow users to write custom GROQ queries for more specific needs.

- GROQ syntax parsing integration for fields.
- Secure deletion functionality with confirmations.

1. Accessibility Improvements

- Direct integration with dataset management page .
- Data import functionality in Discover page.
- Simplified navigation.

Non-Functional Requirements

- Processing time < 2 minutes for 60k records
- Real-time progress tracking
- Error recovery mechanisms

3. Proposed Designs

Data Importer Page -

1. Option
   file:///Users/ruchsh/Desktop/dataimporter_new_1.png

2. Option
   file:///Users/ruchsh/Desktop/option2.png
   file:///Users/ruchsh/Desktop/option_2_steps.png

3. Option
   file:///Users/ruchsh/Desktop/option3.png

Integration Dataset management Page

Option 1

file:///Users/ruchsh/Desktop/integration_dataset_1.png

Giving import option with dataset creation when user selecting indices. We can give a section in case user wants to add data there itself.

Option 2.

file:///Users/ruchsh/Desktop/intg_dataset_add.png

We might show import data fields in add data option. This would be useful once the add the already present data but wish to add more on existing indexes or want to create new index.

Elements Changed in new design

Large dataset preview

file:///Users/ruchsh/Desktop/table.png

The Current preview table is set to only 10 rows. We can enhance the table with more optimized rendering for large rows and columns and giving more features on table like full screen and sorting etc.

Progress Tracking and Error Visualization

1.  Stay informed about the progress of uploads and imports with our real-time progress tracking.

                    a. For short wait times (less than < 10  seconds), it is recommended stick to indeterminate indicators like use skeleton screens or spinners.

    file:///Users/ruchsh/Desktop/loader.png

                   b. For long wait times (10+ seconds), we will provide a clear interface that showcases progress, allows user interaction, and reduces anxiety. Utilize a combination of strategies such as a shimmer effect, background tasks, and storytelling/tips to engage users throughout the extended wait.

    file:///Users/ruchsh/Desktop/progress_bar.png

Progress Tracker

1. Clear and concise error messages provide immediate feedback on failed uploads or mapping issues, enabling quick troubleshooting.

Enhanced Field Mapping ErrorTable

Option 1

file:///Users/ruchsh/Desktop/option1_mapping.png

Option 2
file:///Users/ruchsh/Desktop/mapping_pass.png

Failed mappings

file:///Users/ruchsh/Desktop/failed_mappings.png

Delete confirmation dialog

file:///Users/ruchsh/Desktop/delete_modal.png

4. Architecture

file:///Users/ruchsh/Desktop/architecture.png

Key Components

1. Format Detection Service

- Automatic file type detection
- Format-specific preprocessing

1. GROQ Parser

- Custom log parsing
- Field extraction
- Validation rules

1. Chunking Service

- Batch size: 1000 records
- Memory optimization
- Progress tracking

  4.  Mapping service

- This will return the mismatched type issues from uploaded fields and expected fields , in case of same index upload.

1. Delete Service

- Hard delete functionality
- Multiple confirmation levels
- Audit logging

5. FAQ

Q: How is the 60k document requirement handled?
A: Through chunking and batch processing

Q: How are mapping issues handled for large data?
Two options -
A: Failed type indicators on table
B. Specific area indicating errors in mapping.

Q: Can users upload to existing log indices?
A: yes, and no.
yes, for general indices.
and no, for indices belongs to logs or critical data to prevent confusion

Q: How is accidental deletion prevented?
A: Multi-step confirmation and audit logging

Q. How do we detect the parsing logic for non json file ?
A.

6. Implementation Phases

1. Phase 1 (2 weeks)

- Basic upload improvements
- Large dataset handling
- Enhanced UI/UX
- Delete functionality

1. Phase 2 (2 weeks)

- GROQ integration
- Performance optimization

1. Phase 3 (2 weeks)

- Testing and validation
- Customer feedback integration
- Production deployment
