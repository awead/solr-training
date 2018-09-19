function processAdd(cmd) {
  doc = cmd.solrDoc;
  doc_id = doc.getFieldValue("id");
  doc_date = doc.getFieldValue("upload_date");
  logger.info("Processing date=" + doc_date + " for document with id=" + doc_id);
  new_doc_date = doc_date + "T00:00:00Z";
  logger.info("Setting new date=" + new_doc_date + " for document with id=" + doc_id);
  doc.setField("upload_date", new_doc_date);
}

function processDelete(cmd) {
}

function processMergeIndexes(cmd) {
}

function processCommit(cmd) {
}

function processRollback(cmd) {
}

function finish() {
}
