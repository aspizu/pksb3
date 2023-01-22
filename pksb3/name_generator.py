import string

# FIXME: Change this to the entire unicode
CHARSET = string.printable


class NameGenerator:
    """Generate sequence of strings like: a, b, ..., az, aa, ab, ..."""

    def __init__(self, n: int = 0) -> None:
        self.name = n

    def __next__(self) -> str:
        value = str(self)
        self.name += 1
        return value

    def __str__(self) -> str:
        def f():
            n = self.name
            while True:
                yield CHARSET[n % len(CHARSET)]
                n //= len(CHARSET)
                if n == 0:
                    break

        return "".join(f())
