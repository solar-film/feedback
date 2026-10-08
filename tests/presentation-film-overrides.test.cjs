const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(headers = ['Customer ID', 'Admin', 'Sales', 'Technician', 'Worksite Type', 'Updated At']) {
    const rows = [headers.slice(), ['A', 'Admin', 'Sales', 'Tech', 'บ้าน', 'old timestamp']];
    const removed = [];
    const sheet = {
        getLastColumn: () => Math.max(...rows.map(row => row.length)),
        getLastRow: () => rows.length,
        appendRow: row => rows.push(Array.from(row)),
        deleteRow: row => rows.splice(row - 1, 1),
        insertColumnBefore: column => rows.forEach(row => row.splice(column - 1, 0, '')),
        getRange(r, c, height = 1, width = 1) {
            const range = {
                getDisplayValues: () => Array.from({length:height}, (_,i) => Array.from({length:width}, (_,j) => String(rows[r+i-1]?.[c+j-1] ?? ''))),
                getValues: () => Array.from({length:height}, (_,i) => Array.from({length:width}, (_,j) => rows[r+i-1]?.[c+j-1] ?? '')),
                setValue(value) { (rows[r-1] ||= [])[c-1] = value; return range; },
                setValues(values) { values.forEach((row,i) => row.forEach((value,j) => { (rows[r+i-1] ||= [])[c+j-1] = value; })); return range; },
                setFontWeight() { return range; },
                setBackground() { return range; }
            };
            return range;
        }
    };
    const ctx = vm.createContext({CacheService:{getScriptCache:()=>({remove:key=>removed.push(key)})}});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8'), ctx);
    ctx.ensureSheet = name => { assert.equal(name, 'Presentation Overrides'); return sheet; };
    ctx.getSheetData = name => {
        assert.equal(name, 'Presentation Overrides');
        return rows.slice(1).map(row => Object.fromEntries(rows[0].flatMap((header,i) => [[header,row[i]], ['_col_'+i,row[i]]])));
    };
    ctx.jsonResponse = value => value;
    ctx.getAdminPassword = () => 'test-password';
    const save = overrides => ctx.doPost({postData:{contents:JSON.stringify({action:'savePresentationOverride',password:'test-password',id:'A',presentationOverrides:overrides})}});
    return {ctx, rows, removed, save};
}

test('film overrides persist, preserve multiline models and invalidate public cache', () => {
    const {ctx,rows,removed,save} = setup();
    const result = save({admin:'Admin',sales:'Sales',tech:'Tech',worksiteType:'บ้าน',filmBrand:'  3M  ',filmModel:'CA35\nCA50'});
    assert.equal(result.status,'success');
    assert.equal(result.presentationOverrides.filmBrand,'3M');
    assert.equal(ctx.getPresentationOverridesById(false).A.filmModel,'CA35\nCA50');
    assert.equal(rows[0][5],'Updated At');
    assert.equal(rows[0][6],'Film Brand');
    assert.equal(rows[0][7],'Film Model');
    assert.deepEqual(removed,['public-presentation-v2']);
    save({admin:'New admin',sales:'Sales',tech:'Tech',worksiteType:'บ้าน'});
    assert.equal(ctx.getPresentationOverridesById(false).A.filmBrand,'3M');
    assert.equal(ctx.getPresentationOverridesById(false).A.admin,'New admin');
});

test('resetting one film field retains other values; resetting all returns to source', () => {
    const {ctx,save,rows} = setup();
    save({filmBrand:'3M',filmModel:'CA35'});
    save({filmBrand:'',filmModel:'CA35'});
    assert.equal(ctx.getPresentationOverridesById(false).A.filmBrand,'');
    assert.equal(ctx.getPresentationOverridesById(false).A.filmModel,'CA35');
    const reset=save({filmBrand:'',filmModel:''});
    assert.equal(reset.status,'success');
    assert.equal(rows.length,1);
});

test('five-column schema retains its timestamp when film columns are added', () => {
    const {ctx,rows} = setup(['Customer ID','Admin','Sales','Technician','Updated At']);
    rows[1]=['A','Admin','Sales','Tech','legacy timestamp'];
    ctx.ensurePresentationOverridesSheet();
    assert.equal(rows[0][4],'Worksite Type');
    assert.equal(rows[0][5],'Updated At');
    assert.equal(rows[1][5],'legacy timestamp');
    assert.equal(rows[0][6],'Film Brand');
    ctx.ensurePresentationOverridesSheet();
    assert.equal(rows[0].length,8);
});

test('unauthenticated writes remain rejected', () => {
    const {ctx,rows}=setup();
    const result=ctx.doPost({postData:{contents:JSON.stringify({action:'savePresentationOverride',id:'A',presentationOverrides:{filmBrand:'3M'}})}});
    assert.equal(result.status,'error');
    assert.match(result.message,/Unauthorized/);
    assert.equal(rows[0].length,6);
});
