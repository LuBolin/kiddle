# Kiddle

Kiddle is a short-form comparison trivia game built around one statistic: the number of children attributed to notable figures.

## Language

**Figure**:
A notable historical, modern, or mythological person represented in the game.
_Avoid_: Character, celebrity

**Approved child count**:
The single, sourced integer count used for a Figure under Kiddle's counting rules.
_Avoid_: Family size, children estimate

**Category**:
A defined thematic collection of Figures used to scope Daily, Quick, and Infinite games. The planned launch set is `modern-celebrities`, `east-asian-history`, `east-asian-mythology`, `western-history`, and `western-mythology`.
_Avoid_: Topic, deck

**Tag**:
A short, lower-case label attached to a Figure for editorial grouping and future filtering; tags supplement, but never replace, a Figure's single Category.
_Avoid_: Category, keyword

**Image attribution**:
The creator, licence, and source-page record for the portrait shown for a Figure.
_Avoid_: Image credit, photo note

**Fixed-pair question**:
A comparison of two Figures where the player selects the Figure with the greater approved child count.
_Avoid_: Round, matchup

**Chain question**:
A higher-or-lower comparison where the previous Figure's approved child count is shown and the player guesses whether the next Figure's count is greater or smaller.

**Daily Challenge**:
A date-specific set of ten fixed-pair questions shared by every player using the same category, generated from a stable local-date and category seed.
_Avoid_: Daily quiz
