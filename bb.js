var repoPath = location.search.match(/[\?&]repo_path=([^\&]*)/)[1];
repoPath = decodeURIComponent(repoPath);

function request(opts) {
  return new Promise((success, error) => {
    AP.require('request', function(request) {
      request({
        ...opts,
        success,
        error,
      });
    });
  });
}

export function issues(page=1) {
  return request({
    url: `/2.0/repositories/${repoPath}/issues?page=${page}`,
  });
}

function toQuery(obj) {
  let query = '';
  for (var key in obj) {
    query = `${query}&${key}=${encodeURIComponent(obj[key])}`;
  }
  return query.substr(1);
}

export function updateIssue(issue_id, opts) {
  return request({
    url: `/1.0/repositories/${repoPath}/issues/${issue_id}`,
    type: 'PUT',
    contentType: 'application/x-www-form-urlencoded',
    data: toQuery(opts),
  });
}

