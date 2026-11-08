# 07: Single-choice groups announce as radios

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The five single-choice sets use one pattern: a `radiogroup` on the container and `radio` with `checked` on each
option. The gallery's scope and status chips, the detail's chips, the sort sheet, the account sheet's language and the
share picker's levels all follow it; the `Chip` itself is the radio. The group labels name the set, and the chip and
scope labels keep their counts.

The suites assert the role, the group and the checked state. The emulator's accessibility tree shows the scope and the
status chips as `android.widget.RadioButton` with `checkable="true"` and the selected option `checked="true"`, carrying
`Toutes 13` and `Toutes les pistes 1385`.
