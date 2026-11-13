from collections import OrderedDict
from typing import Dict, Any, Optional

class AnalysisStore:
    def __init__(self, max_size: int = 20):
        self.max_size = max_size
        self._store: OrderedDict[str, Dict[str, Any]] = OrderedDict()

    def put(self, analysis_id: str, data: Dict[str, Any]):
        if analysis_id in self._store:
            self._store.move_to_end(analysis_id)
        self._store[analysis_id] = data
        if len(self._store) > self.max_size:
            self._store.popitem(last=False)

    def get(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        if analysis_id in self._store:
            self._store.move_to_end(analysis_id)
            return self._store[analysis_id]
        return None

# Global store singleton
analysis_store = AnalysisStore(max_size=20)

